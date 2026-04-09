import json
import httpx
import re
import os
import platform
import datetime
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.services.pool import connection_pool, ACTIVE_CONNECTIONS
from app.services.tool_service import tool_registry
from app.guardrails.validator import validator
from app.core.settings import settings
from app.services.context_strategy import apply_context_strategy

MAX_REACT_STEPS = 10

ORCHESTRATION_PROFILES: Dict[str, Dict[str, Any]] = {
    "adaptive": {
        "system_prompt": (
            "[COGNITIVE MODE: ADAPTIVE]\n"
            "Choose the smallest sufficient path: local tools first when they solve the task, "
            "MCP tools for bridge-capable operations, and agent handoffs only when the task needs delegation. "
            "Keep reasoning concise and only call tools that materially move the task forward."
        ),
        "tool_priority": ("local", "mcp", "a2a"),
        "max_steps": 10,
    },
    "mcp_only": {
        "system_prompt": (
            "[COGNITIVE MODE: MCP]\n"
            "Use MCP and bridge-native tools only. Prefer direct tool execution over delegation. "
            "Do not hand off to other agents unless no MCP tool can satisfy the request."
        ),
        "tool_priority": ("mcp", "local", "a2a"),
        "max_steps": 8,
    },
    "a2a_only": {
        "system_prompt": (
            "[COGNITIVE MODE: A2A]\n"
            "Prefer agent-to-agent delegation and coordination. "
            "Avoid local or MCP tools unless they are required to prepare a handoff."
        ),
        "tool_priority": ("a2a", "mcp", "local"),
        "max_steps": 8,
    },
    "local_only": {
        "system_prompt": (
            "[COGNITIVE MODE: LOCAL]\n"
            "Use local reasoning and local deterministic tools only. "
            "Do not delegate to other agents or use external bridge tools."
        ),
        "tool_priority": ("local",),
        "max_steps": 6,
    },
}


def _normalize_message(message: Any) -> Dict[str, Any]:
    if isinstance(message, dict):
        return message
    if hasattr(message, "model_dump"):
        return message.model_dump()
    return {
        "role": getattr(message, "role", "user"),
        "content": getattr(message, "content", ""),
    }


def _content_to_text(content: Any) -> str:
    if isinstance(content, list):
        parts: List[str] = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    parts.append(str(item.get("text", "")))
                else:
                    parts.append(str(item.get("text") or item.get("content") or ""))
            else:
                parts.append(str(item))
        return " ".join(part for part in parts if part).strip()
    if isinstance(content, dict):
        return json.dumps(content, ensure_ascii=False)
    return str(content or "")


def _telemetry_bytes(event: str, details: str) -> bytes:
    payload = {"type": "telemetry", "event": event, "details": details}
    return f"data: {json.dumps(payload)}\n\n".encode("utf-8")

def _looks_like_tool_block(content: str) -> bool:
    if not content:
        return False
    if "<tool_call>" in content:
        return True
    return False


def _classify_tool(tool: Dict[str, Any]) -> str:
    function = tool.get("function", tool)
    name = str(function.get("name", "")).lower()
    if any(token in name for token in ("agent", "a2a", "handoff", "delegate", "orchestrate")):
        return "a2a"
    if any(token in name for token in ("mcp", "web_search", "knowledge", "file_", "read_file", "write_file", "calculate", "get_current_time", "search")):
        return "mcp"
    return "local"


def normalize_system_prompt_and_tools(messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """Ensure system prompt/tools are static at index 0 and strip timestamps."""
    system_contents = []
    other_messages = []
    
    for msg in messages:
        if msg.get("role") == "system":
            content = str(msg.get("content", ""))
            # Strip timestamps
            content = re.sub(r"\[\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\]", "", content)
            content = re.sub(r"\[\d{1,2}/\d{1,2}/\d{2,4}[, ]+\d{1,2}:\d{2}:\d{2}(?:\s*[APap][Mm])?\]", "", content)
            content = re.sub(r"\[\d{2}:\d{2}:\d{2}\]", "", content)
            content = re.sub(r"\b\d{2}:\d{2}:\d{2}\b", "", content) # standalone time
            system_contents.append(content.strip())
        else:
            other_messages.append(msg)
            
    base_system = "\n\n".join(system_contents).strip()
    
    if tools:
        from app.services.tool_service import tools_to_xml
        xml_tools = tools_to_xml(tools)
        base_system = f"{base_system}\n\nAvailable Tools:\n{xml_tools}".strip()
        
    if base_system:
        return [{"role": "system", "content": base_system}] + other_messages
    return other_messages


def build_orchestration_profile(mode: Optional[str]) -> Dict[str, Any]:
    normalized = (mode or "adaptive").strip().lower()
    return ORCHESTRATION_PROFILES.get(normalized, ORCHESTRATION_PROFILES["adaptive"]) | {"mode": normalized}


def prioritize_tools_for_mode(tools: List[Dict[str, Any]], mode: Optional[str]) -> List[Dict[str, Any]]:
    if not tools:
        return tools

    profile = build_orchestration_profile(mode)
    priority = profile.get("tool_priority", ("local", "mcp", "a2a"))
    ordered: List[Dict[str, Any]] = []
    remaining = tools[:]

    for category in priority:
        matched = [tool for tool in remaining if _classify_tool(tool) == category]
        ordered.extend(matched)
        remaining = [tool for tool in remaining if tool not in matched]

    ordered.extend(remaining)

    if profile["mode"] == "local_only":
        # Keep only local tools when the caller explicitly wants an offline path.
        return [tool for tool in ordered if _classify_tool(tool) == "local"]

    return ordered


def build_orchestration_system_prompt(mode: Optional[str]) -> str:
    profile = build_orchestration_profile(mode)
    
    current_os = platform.system()
    current_cwd = os.getcwd()
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return (
        f"<persona>\n{profile['system_prompt']}\n</persona>\n\n"
        f"<environment>\n"
        f"  <os>{current_os}</os>\n"
        f"  <cwd>{current_cwd}</cwd>\n"
        f"  <time>{current_time}</time>\n"
        f"</environment>\n\n"
        f"<rules>\n"
        f"  1. Tool calls should use XML format:\n"
        f"     <tool_call>\n"
        f"       <name>tool_name</name>\n"
        f"       <arguments>\n"
        f"         <arg_name>value</arg_name>\n"
        f"       </arguments>\n"
        f"     </tool_call>\n"
        f"  2. Do not invent file paths. If a path is unknown, call file_list first or ask the user.\n"
        f"  3. You MUST wrap your reasoning in <thought>...</thought> blocks before calling tools or responding.\n"
        f"  4. You MUST use <reflection>...</reflection> blocks to evaluate the results of tool calls and adjust your plan.\n"
        f"</rules>"
    )

async def _compress_tool_result(result_str: str, tool_name: str, model_id: str) -> str:
    """Active Compression Mode to summarize large tool results and prevent Amnesia."""
    try:
        client = connection_pool.get_client("openai")
        headers = {"Content-Type": "application/json"}
        prompt = f"Summarize this raw tool result from '{tool_name}' into a concise conclusion. Discard raw data and noise. Result:\n{result_str[:4000]}"
        
        payload = {
            "model": model_id,
            "messages": [
                {"role": "system", "content": "[COGNITIVE MODE: COMPRESSION] You are a data compressor. Output only the summarized facts."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 512,
            "stream": False
        }
        
        resp = await client.post(
            f"{settings.lm_studio_base_url}/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=15.0
        )
        
        if resp.status_code == 200:
            data = resp.json()
            summary = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if summary:
                print(f"[Agentic Bridge] Compression Mode active: Compressed {len(result_str)} chars to {len(summary)} chars.")
                return f"[COMPRESSED SUMMARY]\n{summary}\n[END SUMMARY]"
                
    except Exception as e:
        print(f"[Agentic Bridge] Compression Mode failed: {e}")
        
    # Fallback to truncation
    return result_str[:500] + f"\n... [ToolResult truncated from {len(result_str)} chars]"

async def intercept_and_execute_tools(
    initial_response: httpx.Response,
    original_payload: Dict[str, Any],
    messages: List[Dict[str, Any]],
    orchestration_mode: Optional[str] = None
) -> AsyncGenerator[bytes, None]:
    """
    Advanced agentic interceptor that handles <tool_call> tags in real-time.
    Recursively executes tools and re-prompts the LLM.
    """
    current_response = initial_response
    current_messages = [_normalize_message(message) for message in messages]
    recursive_hops = 0
    profile = build_orchestration_profile(orchestration_mode)
    profile_max_steps = int(profile.get("max_steps") or MAX_REACT_STEPS)
    
    # Use a single stable ID for the entire SSE stream to maintain compatibility with standard OpenAI clients
    import time
    session_data_id = f"chatcmpl-agent-{int(time.time()*1000)}"

    try:
        requested_max_steps = original_payload.get("max_steps")
        max_react_steps = int(requested_max_steps) if requested_max_steps is not None else profile_max_steps
    except (TypeError, ValueError):
        max_react_steps = profile_max_steps
    max_react_steps = max(1, min(max_react_steps, MAX_REACT_STEPS))

    try:
        requested_tool_budget = original_payload.get("tool_budget")
        if requested_tool_budget is None:
            tool_budget_remaining = max_react_steps
        else:
            tool_budget_remaining = max(0, int(requested_tool_budget))
    except (TypeError, ValueError):
        tool_budget_remaining = max_react_steps

    force_json_mode = bool(
        isinstance(original_payload.get("response_format"), dict)
        and original_payload["response_format"].get("type") == "json_object"
    )

    from app.services.context_manager import context_controller

    while recursive_hops < max_react_steps:
        # --- Cognitive Mode Switch (Predictive Unloading) ---
        is_router_mode = (recursive_hops < 2)
        cognitive_mode = "router" if is_router_mode else "reasoning"
        
        # Before each hop, adjust context based on accumulated tool payload
        tool_results_size = sum(
            len(_content_to_text(msg.get("content", "")))
            for msg in current_messages
            if msg.get("role") == "user" and "<tool_response>" in _content_to_text(msg.get("content", ""))
        )
        await context_controller.adjust_for_trajectory(
            recursive_hops,
            tool_results_size,
            cognitive_mode,
            model_id=original_payload.get("model"),
        )
        # ----------------------------------------------------

        recursive_hops += 1
        is_tool_call_mode = False
        tool_call_buffer = ""
        assistant_content = ""
        finish_reason = None
        last_data_id = session_data_id
        last_created = 0
        last_model = original_payload.get("model", "")
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
                        continue
                        
                    data_str = line[6:]
                    try:
                        data = json.loads(data_str)
                        content = ""
                        last_data_id = data.get("id", last_data_id)
                        last_created = data.get("created", last_created)
                        last_model = data.get("model", last_model)
                        
                        choices = data.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            if delta.get("content"):
                                content = delta["content"]
                            if choices[0].get("finish_reason"):
                                finish_reason = choices[0]["finish_reason"]
                                
                        if content:
                            if _looks_like_tool_block(content) or _looks_like_tool_block(tool_call_buffer):
                                is_tool_call_mode = True
                            
                            if is_tool_call_mode:
                                is_first_tool_chunk = (len(tool_call_buffer) == 0)
                                tool_call_buffer += content
                                
                                if is_first_tool_chunk:
                                    # Inject markdown code block start so standard clients render the XML visibly
                                    prefix_chunk = {
                                        "id": last_data_id,
                                        "object": "chat.completion.chunk",
                                        "created": last_created,
                                        "model": last_model,
                                        "choices": [{"index": 0, "delta": {"content": "\n```xml\n"}, "finish_reason": None}]
                                    }
                                    yield f"data: {json.dumps(prefix_chunk)}\n\n".encode("utf-8")
                                    
                                # Stream the XML tool call as text content
                                msg_chunk = {
                                    "id": last_data_id,
                                    "object": "chat.completion.chunk",
                                    "created": last_created,
                                    "model": last_model,
                                    "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": None}]
                                }
                                yield f"data: {json.dumps(msg_chunk)}\n\n".encode("utf-8")

                                if "</tool_call>" in tool_call_buffer:
                                    # Close the markdown code block
                                    suffix_chunk = {
                                        "id": last_data_id,
                                        "object": "chat.completion.chunk",
                                        "created": last_created,
                                        "model": last_model,
                                        "choices": [{"index": 0, "delta": {"content": "\n```\n"}, "finish_reason": None}]
                                    }
                                    yield f"data: {json.dumps(suffix_chunk)}\n\n".encode("utf-8")
                                    break
                            else:
                                assistant_content += content
                                yield (line + "\n\n").encode("utf-8")
                        else:
                            if not is_tool_call_mode:
                                yield (line + "\n\n").encode("utf-8")
                    except Exception:
                        if not is_tool_call_mode:
                            yield (line + "\n\n").encode("utf-8")
                
                if is_tool_call_mode and "</tool_call>" in tool_call_buffer:
                    break
            
            # Close the current response once processing finished
            try:
                await current_response.aclose()
            except Exception:
                pass
            ACTIVE_CONNECTIONS.dec()
            
            if finish_reason == "length" and not is_tool_call_mode:
                yield _telemetry_bytes("auto_continue", "Context length reached. Automatically continuing generation...")
                current_messages.append({"role": "assistant", "content": assistant_content})
                current_messages.append({"role": "user", "content": "[SYSTEM: Context length reached. Please continue exactly where you left off.]"})
                
                from app.services.context_builder import enforce_context_window
                max_tokens = original_payload.get("max_tokens") or 8192
                current_goal = ""
                strategy = original_payload.get("context_strategy") or "full"
                current_messages = await apply_context_strategy(current_messages, current_goal, strategy, max_tokens)
                follow_up_payload = {**original_payload, "messages": enforce_context_window(current_messages, max_tokens)}
                
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
                continue
                
            if is_tool_call_mode:
                # NeMo-Style Guardrail Validation
                is_valid, tool_data, parse_error = validator.validate_tool_call(tool_call_buffer)
                
                # --- Breadcrumb Pattern (Extract <think> blocks) ---
                breadcrumb = None
                tool_call_content = tool_call_buffer
                think_match = re.search(r"<think>([\s\S]*?)</think>", tool_call_buffer)
                if think_match:
                    breadcrumb = think_match.group(1).strip()
                    # Strip <think> block from the VRAM context to save tokens on subsequent hops
                    tool_call_content = re.sub(r"<think>[\s\S]*?</think>", "", tool_call_buffer).strip()
                    print(f"[Agentic Bridge] Breadcrumb extracted: {len(breadcrumb)} chars saved from GPU context.")
                    
                    # Yield telemetry event
                    yield _telemetry_bytes("breadcrumb", f"Extracted {len(breadcrumb)} chars of reasoning to save VRAM.")
                # ---------------------------------------------------
                
                if tool_budget_remaining <= 0:
                    yield _telemetry_bytes(
                        "budget_exhausted",
                        f"Tool budget exhausted at hop {recursive_hops}; skipping tool execution."
                    )
                    break

                if tool_data and isinstance(tool_data, dict) and tool_data.get("name"):
                    tool_name = tool_data["name"]
                    args = tool_data.get("arguments") or tool_data.get("parameters") or {}
                    tool_call_content = re.sub(r"```[a-zA-Z0-9_-]*\n", "", tool_call_content).replace("```", "").strip()
                    
                    if tool_name == "ask_user_question":
                        question = args.get("question", "")
                        # Yield the question directly to the user as content
                        msg_chunk = {
                            "id": last_data_id,
                            "object": "chat.completion.chunk",
                            "created": last_created,
                            "model": last_model,
                            "choices": [{"index": 0, "delta": {"content": f"\n\n[Question to User]: {question}"}, "finish_reason": "stop"}]
                        }
                        yield f"data: {json.dumps(msg_chunk)}\n\n".encode("utf-8")
                        yield _telemetry_bytes("ask_user_question", f"Agent paused to ask user: {question}")
                        break

                    # Execution
                    call_result = await tool_registry.execute(tool_name, args)
                    tool_budget_remaining = max(0, tool_budget_remaining - 1)
                    
                    if call_result.success:
                        result_str = str(call_result.result.get("content") if isinstance(call_result.result, dict) and "content" in call_result.result else call_result.result)
                        
                        # --- Formal Compression Mode (Fixing Type B Amnesia) ---
                        # Summarize massive tool payloads to preserve only conclusions,
                        # reducing cognitive load and preventing context pollution on Hop 3.
                        if len(result_str) > 500 and recursive_hops >= 2:
                            model_id = original_payload.get("model", "qwen3.5-4b")
                            content_val = await _compress_tool_result(result_str, tool_name, model_id)
                            telemetry = {"type": "telemetry", "event": "compression", "details": f"Compressed tool payload ({len(result_str)} chars) to prevent context pollution."}
                            yield f"data: {json.dumps(telemetry)}\n\n".encode("utf-8")
                        elif len(result_str) > 1500:
                            # Fallback truncation if not compressed
                            content_val = result_str[:1500] + f"\n\n... [ToolResult truncated. {len(result_str) - 1500} chars omitted to save context memory.]"
                        else:
                            content_val = result_str
                        # -------------------------------------------------------
                    else:
                        content_val = f"Error: {call_result.error}"
                    
                    tool_response_json = json.dumps({'name': tool_name, 'content': content_val})
                    yield _telemetry_bytes("tool_result", tool_response_json)
                    
                    # Yield the tool response directly as markdown text for generic clients
                    response_markdown = f"\n```json\n// Tool Response: {tool_name}\n<tool_response>\n{tool_response_json}\n</tool_response>\n```\n"
                    msg_chunk = {
                        "id": last_data_id,
                        "object": "chat.completion.chunk",
                        "created": last_created,
                        "model": last_model,
                        "choices": [{"index": 0, "delta": {"content": response_markdown}, "finish_reason": None}]
                    }
                    yield f"data: {json.dumps(msg_chunk)}\n\n".encode("utf-8")
                    
                    # Construct follow-up
                    current_messages.append({"role": "assistant", "content": tool_call_content})
                    current_messages.append({
                        "role": "user",
                        "content": f"<tool_response>\n{tool_response_json}\n</tool_response>"
                    })
                else:
                    # JSON parsing failed or missing name, inject error and retry
                    error_msg = parse_error or "Invalid tool call format. Expected XML format with a <name> field."
                    
                    # --- Warm Start KV Cache Strategy (Rollback Points) ---
                    # Do NOT append the hallucinated output or the error message to the context history.
                    # We treat the context like a database transaction and rollback to keep the KV cache pure.
                    print(f"[Agentic Bridge] Rollback Point triggered: Discarding invalid JSON to preserve KV cache. Error: {error_msg}")
                    yield _telemetry_bytes("rollback", f"Tool error intercepted. Rolling back KV Cache to prevent pollution. ({error_msg})")
                    # ------------------------------------------------------
                    
                    # --- Breadcrumb Reinjection ---
                    reinject_str = ""
                    if breadcrumb:
                        reinject_str = f" Previously, you thought: '{breadcrumb[:500]}...'\n"
                        print("[Agentic Bridge] Reinjecting breadcrumb into system prompt due to failure.")
                    # ------------------------------

                    # We inject a temporary hint instead of modifying the system prompt to maintain KV cache
                    hint_msg = f"[SYSTEM HINT: Your previous attempt failed. {error_msg}.{reinject_str} Please use strict <tool_call> tags.]"
                    current_messages.append({"role": "user", "content": hint_msg})
                    
                    # Force JSON mode on the next attempt to guarantee structural compliance
                    # original_payload["response_format"] = {"type": "json_object"}
                    pass
                    
                # Retry logic for both success (continue agent loop) and failure (fix JSON)
                from app.services.context_builder import enforce_context_window
                
                # Compress older context if approaching limits, preserving headroom for tools
                max_tokens = original_payload.get("max_tokens") or 8192
                current_goal = ""
                for message in current_messages:
                    if message.get("role") == "user":
                        current_goal = str(message.get("content", ""))
                        break
                strategy = original_payload.get("context_strategy") or "full"
                current_messages = await apply_context_strategy(current_messages, current_goal, strategy, max_tokens)
                follow_up_payload = {**original_payload, "messages": enforce_context_window(current_messages, max_tokens)}
                force_json_mode = force_json_mode or bool(original_payload.get("response_format"))
                
                if force_json_mode:
                    follow_up_payload["response_format"] = {"type": "json_object"}
                    # Lower temperature for constrained decoding to reduce entropy and improve speed
                    follow_up_payload["temperature"] = min(follow_up_payload.get("temperature", 0.1), 0.1)

                    # --- GBNF Grammar Injection ---
                    # Extract the intended tool name from the failed buffer
                    import re
                    name_match = re.search(r'<(?:name|tool_name)>\s*([^<]+)\s*</(?:name|tool_name)>', tool_call_buffer)
                    if not name_match:
                        name_match = re.search(r'"name"\s*:\s*"([^"]+)"', tool_call_buffer)
                    if name_match:
                        intended_tool_name = name_match.group(1).strip()
                        # Find the schema for the intended tool
                        available_tools = original_payload.get("tools") or tool_registry.list_tools()
                        expected_tool = None
                        for t in available_tools:
                            if t.get("function", {}).get("name") == intended_tool_name:
                                expected_tool = t.get("function")
                                break
                        
                        if expected_tool:
                            try:
                                from app.guardrails.grammar_builder import generate_tool_call_grammar
                                follow_up_payload["grammar"] = generate_tool_call_grammar(expected_tool)
                                print(f"[Agentic Bridge] GBNF grammar injected for tool: {intended_tool_name}")
                            except ImportError:
                                pass
                    # ------------------------------
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
                
                # --- Cognitive Mode Switch ---
                # Router Mode: Simple tool selection (Hop 1)
                # Reasoning Mode: Deep thought (Hop 2+)
                is_router_mode = (recursive_hops < 2)
                
                if is_router_mode:
                    follow_up_payload["messages"].append({
                        "role": "user",
                        "content": "[COGNITIVE MODE: ROUTER]\nPick exactly one tool to use next. Do not provide any explanations or <think> blocks. Output only the tool call."
                    })
                    follow_up_payload["max_tokens"] = min(follow_up_payload.get("max_tokens", 2048), 512)
                    print(f"[Agentic Bridge] Switching to ROUTER MODE (Hop {recursive_hops})")
                    yield _telemetry_bytes("mode_switch", f"Hop {recursive_hops}: Switching to ROUTER MODE. Freezing deep layers to save VRAM.")
                else:
                    follow_up_payload["messages"].append({
                        "role": "user",
                        "content": "[COGNITIVE MODE: REASONING]\nThink step-by-step using <think> blocks before acting. Evaluate the previous tool results carefully."
                    })
                    follow_up_payload["max_tokens"] = max(follow_up_payload.get("max_tokens", 2048), 2048)
                    print(f"[Agentic Bridge] Switching to REASONING MODE (Hop {recursive_hops})")
                    yield _telemetry_bytes("mode_switch", f"Hop {recursive_hops}: Switching to REASONING MODE. Thawing deep layers for complex thought.")
                # -----------------------------

                if tool_budget_remaining <= 0:
                    yield _telemetry_bytes(
                        "budget_exhausted",
                        f"Tool budget exhausted at hop {recursive_hops}; stopping follow-up generation."
                    )
                    break

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
            
    yield b"data: [DONE]\n\n"

