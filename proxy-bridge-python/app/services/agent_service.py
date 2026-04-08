import json
import httpx
import re
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.services.pool import connection_pool, ACTIVE_CONNECTIONS
from app.services.tool_service import tool_registry
from app.guardrails.validator import validator
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
                # NeMo-Style Guardrail Validation
                is_valid, tool_data, parse_error = validator.validate_tool_call(tool_call_buffer)
                tool_call_content = tool_call_buffer # Keep raw content for history
                
                if tool_data and isinstance(tool_data, dict) and tool_data.get("name"):
                    tool_name = tool_data["name"]
                    args = tool_data.get("arguments") or tool_data.get("parameters") or {}
                    
                    # Execution
                    call_result = await tool_registry.execute(tool_name, args)
                    
                    if call_result.success:
                        result_str = str(call_result.result.get("content") if isinstance(call_result.result, dict) and "content" in call_result.result else call_result.result)
                        
                        # --- Tool Memory Compression ---
                        # For M4000/Legacy VRAM, truncate massive payloads
                        if len(result_str) > 1500:
                            truncated_len = len(result_str)
                            result_str = result_str[:1500] + f"\n\n... [ToolResult truncated. {truncated_len - 1500} chars omitted to save context memory.]"
                        
                        content_val = result_str
                    else:
                        content_val = f"Error: {call_result.error}"
                    
                    # Construct follow-up
                    current_messages.append({"role": "assistant", "content": tool_call_content})
                    current_messages.append({
                        "role": "user",
                        "content": f"<tool_response>\n{json.dumps({'name': tool_name, 'content': content_val})}\n</tool_response>"
                    })
                else:
                    # JSON parsing failed or missing name, inject error and retry
                    error_msg = parse_error or "Invalid tool call format. Expected JSON with a 'name' field."
                    current_messages.append({"role": "assistant", "content": tool_call_content})
                    current_messages.append({
                        "role": "user",
                        "content": f"System Error: Failed to parse tool call JSON. {error_msg}. Please fix the JSON syntax and try again using strict <tool_call> tags."
                    })
                    
                    # Force JSON mode on the next attempt to guarantee structural compliance
                    original_payload["response_format"] = {"type": "json_object"}
                    
                # Retry logic for both success (continue agent loop) and failure (fix JSON)
                from app.services.context_builder import enforce_context_window
                
                # Compress older context if approaching limits, preserving headroom for tools
                max_tokens = original_payload.get("max_tokens") or 8192
                follow_up_payload = {**original_payload, "messages": enforce_context_window(current_messages, max_tokens)}
                
                # --- Cognition Sharding ---
                # If we're deep in a multi-turn reasoning loop, escalate to a more capable model
                if recursive_hops >= 3:
                    import os
                    fallback_model = os.environ.get("REASONING_FALLBACK_MODEL")
                    current_model = follow_up_payload.get("model")
                    if fallback_model and current_model != fallback_model:
                        print(f"[Agentic Bridge] Cognition Sharding: Escalating reasoning from {current_model} to {fallback_model} (Hop {recursive_hops})")
                        follow_up_payload["model"] = fallback_model
                # --------------------------
                
                client = connection_pool.get_client("openai")
                headers = {"Content-Type": "application/json"}
                
                req = client.build_request(
                    "POST", 
                    f"{settings.lm_studio_base_url}/v1/chat/completions",
                    json=follow_up_payload,
                    headers=headers
                )
                next_response = await client.send(req, stream=True)
                next_response.raise_for_status()
                current_response = next_response
                continue # Restart loop with the new response
            else:
                # No more tools, we're done
                break
                
        except Exception as e:
            ACTIVE_CONNECTIONS.dec()
            yield f'data: {{"error": "{str(e)}"}}\n\n'.encode("utf-8")
            break
