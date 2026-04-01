import json
import httpx
import re
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.services.pool import connection_pool, ACTIVE_CONNECTIONS
from app.services.tools import tool_orchestrator
from app.core.settings import settings

MAX_REACT_STEPS = 10

async def intercept_and_execute_tools(
    initial_response: httpx.Response,
    original_payload: Dict[str, Any],
    messages: List[Dict[str, Any]]
) -> AsyncGenerator[bytes, None]:
    """
    Advanced agentic interceptor that handles <tool_call> tags in real-time.
    Recursively executes tools and re-prompts the LLM.
    """
    current_response = initial_response
    current_messages = list(messages)
    recursive_hops = 0
    
    while recursive_hops < MAX_REACT_STEPS:
        recursive_hops += 1
        is_tool_call_mode = False
        tool_call_buffer = ""
        buffer = ""
        
        try:
            # Re-using ACTIVE_CONNECTIONS logic
            ACTIVE_CONNECTIONS.inc()
            
            async for chunk in current_response.aiter_bytes():
                text = chunk.decode("utf-8")
                buffer += text
                
                # Split buffer by lines but keep last potential partial line
                lines = buffer.split("\n")
                buffer = lines.pop()
                
                for line in lines:
                    if not line.startswith("data: "):
                        if not is_tool_call_mode and line.strip():
                            yield (line + "\n").encode("utf-8")
                        continue
                    
                    if line.strip() == "data: [DONE]":
                        if not is_tool_call_mode:
                            yield (line + "\n\n").encode("utf-8")
                        continue
                        
                    data_str = line[6:]
                    try:
                        data = json.loads(data_str)
                        content = ""
                        # Standard OpenAI Delta format
                        if data.get("choices") and data["choices"][0].get("delta", {}).get("content"):
                            content = data["choices"][0]["delta"]["content"]
                            
                        if content:
                            if "<tool_call>" in content or "<tool_call>" in tool_call_buffer:
                                is_tool_call_mode = True
                            
                            if is_tool_call_mode:
                                tool_call_buffer += content
                            else:
                                yield (line + "\n\n").encode("utf-8")
                        else:
                            if not is_tool_call_mode:
                                yield (line + "\n\n").encode("utf-8")
                    except Exception:
                        if not is_tool_call_mode:
                            yield (line + "\n\n").encode("utf-8")
            
            # Close the current response once processing finished
            await current_response.aclose()
            ACTIVE_CONNECTIONS.dec()

            if is_tool_call_mode:
                # Parsing the tool call XML/JSON
                match = re.search(r"<tool_call>([\s\S]*?)</tool_call>", tool_call_buffer)
                tool_data = None
                tool_call_content = ""
                
                if match:
                    try:
                        tool_data = json.loads(match.group(1))
                        tool_call_content = match.group(0)
                    except: pass
                else:
                    try:
                        tool_data = json.loads(tool_call_buffer.strip())
                        tool_call_content = tool_call_buffer.strip()
                    except: pass
                
                if tool_data and tool_data.get("name"):
                    tool_name = tool_data["name"]
                    args = tool_data.get("arguments") or tool_data.get("parameters") or {}
                    
                    # Execution
                    result = await tool_orchestrator.execute_tool(tool_name, args)
                    
                    # Construct follow-up
                    current_messages.append({"role": "assistant", "content": tool_call_content})
                    current_messages.append({
                        "role": "user",
                        "content": f"<tool_response>\n{json.dumps({'name': tool_name, 'content': result['content']})}\n</tool_response>"
                    })
                    
                    follow_up_payload = {**original_payload, "messages": current_messages}
                    
                    client = connection_pool.get_client("openai")
                    headers = {"Content-Type": "application/json"}
                    
                    req = client.build_request(
                        "POST", 
                        f"{settings.lm_studio_base_url}/chat/completions",
                        json=follow_up_payload,
                        headers=headers
                    )
                    next_response = await client.send(req, stream=True)
                    next_response.raise_for_status()
                    current_response = next_response
                    continue # Restart loop with the new response
                else:
                    # Failed to parse, yield dummy error and break
                    yield b'data: {"error": "Failed to parse tool call"}\n\n'
                    break
            else:
                # No more tools, we're done
                break
                
        except Exception as e:
            ACTIVE_CONNECTIONS.dec()
            yield f'data: {{"error": "{str(e)}"}}\n\n'.encode("utf-8")
            break
