import json
import httpx
import re
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.services.pool import connection_pool, ACTIVE_CONNECTIONS
from app.services.tool_service import tool_registry
from app.guardrails.validator import validator
from app.core.settings import settings

MAX_REACT_STEPS = 10

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
    messages: List[Dict[str, Any]]
) -> AsyncGenerator[bytes, None]:
    """
    Advanced agentic interceptor that handles <tool_call> tags in real-time.
    Recursively executes tools and re-prompts the LLM.
    """
    current_response = initial_response
    current_messages = list(messages)
    recursive_hops = 0

    from app.services.context_manager import context_controller

    while recursive_hops < MAX_REACT_STEPS:
        # --- Cognitive Mode Switch (Predictive Unloading) ---
        is_router_mode = (recursive_hops < 2)
        cognitive_mode = "router" if is_router_mode else "reasoning"
        
        # Before each hop, adjust context based on accumulated tool payload
        tool_results_size = sum(
            len(msg.get("content", "")) 
            for msg in current_messages 
            if msg.get("role") == "user" and "<tool_response>" in msg.get("content", "")
        )
        await context_controller.adjust_for_trajectory(recursive_hops, tool_results_size, cognitive_mode)
        # ----------------------------------------------------

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
                    telemetry = {"type": "telemetry", "event": "breadcrumb", "details": f"Extracted {len(breadcrumb)} chars of reasoning to save VRAM."}
                    yield f"data: {json.dumps(telemetry)}\n\n".encode("utf-8")
                # ---------------------------------------------------
                
                if tool_data and isinstance(tool_data, dict) and tool_data.get("name"):
                    tool_name = tool_data["name"]
                    args = tool_data.get("arguments") or tool_data.get("parameters") or {}
                    
                    # Execution
                    call_result = await tool_registry.execute(tool_name, args)
                    
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
                    
                    # Construct follow-up
                    current_messages.append({"role": "assistant", "content": tool_call_content})
                    current_messages.append({
                        "role": "user",
                        "content": f"<tool_response>\n{json.dumps({'name': tool_name, 'content': content_val})}\n</tool_response>"
                    })
                else:
                    # JSON parsing failed or missing name, inject error and retry
                    error_msg = parse_error or "Invalid tool call format. Expected JSON with a 'name' field."
                    
                    # --- Warm Start KV Cache Strategy (Rollback Points) ---
                    # Do NOT append the hallucinated output or the error message to the context history.
                    # We treat the context like a database transaction and rollback to keep the KV cache pure.
                    print(f"[Agentic Bridge] Rollback Point triggered: Discarding invalid JSON to preserve KV cache. Error: {error_msg}")
                    telemetry = {"type": "telemetry", "event": "rollback", "details": f"Tool error intercepted. Rolling back KV Cache to prevent pollution. ({error_msg})"}
                    yield f"data: {json.dumps(telemetry)}\n\n".encode("utf-8")
                    # ------------------------------------------------------
                    
                    # --- Breadcrumb Reinjection ---
                    reinject_str = ""
                    if breadcrumb:
                        reinject_str = f" Previously, you thought: '{breadcrumb[:500]}...'\n"
                        print("[Agentic Bridge] Reinjecting breadcrumb into system prompt due to failure.")
                    # ------------------------------

                    # We inject a temporary system hint instead of appending a user message
                    sys_msg_idx = next((i for i, m in enumerate(original_payload.get("messages", [])) if m["role"] == "system"), None)
                    if sys_msg_idx is not None:
                        base_sys = original_payload["messages"][sys_msg_idx]["content"]
                        original_payload["messages"][sys_msg_idx]["content"] = base_sys + f"\n[SYSTEM HINT: Your previous attempt failed. {error_msg}.{reinject_str} Please use strict <tool_call> tags.]"
                    
                    # Force JSON mode on the next attempt to guarantee structural compliance
                    original_payload["response_format"] = {"type": "json_object"}
                    
                # Retry logic for both success (continue agent loop) and failure (fix JSON)
                from app.services.context_builder import enforce_context_window
                
                # --- Semantic Context Pruning ---
                try:
                    from app.services.context_pruner import semantic_prune_context
                    current_goal = messages[0].get("content", "") if messages else "Use tools correctly."
                    current_messages = await semantic_prune_context(current_messages, current_goal, threshold=0.6)
                except Exception as e:
                    print(f"[Agentic Bridge] Semantic pruning skipped: {e}")
                # --------------------------------

                # Compress older context if approaching limits, preserving headroom for tools
                max_tokens = original_payload.get("max_tokens") or 8192
                follow_up_payload = {**original_payload, "messages": enforce_context_window(current_messages, max_tokens)}
                
                if force_json_mode:
                    follow_up_payload["response_format"] = {"type": "json_object"}
                    # Lower temperature for constrained decoding to reduce entropy and improve speed
                    follow_up_payload["temperature"] = min(follow_up_payload.get("temperature", 0.1), 0.1)

                    # --- GBNF Grammar Injection ---
                    # Extract the intended tool name from the failed buffer
                    import re
                    name_match = re.search(r'"name"\s*:\s*"([^"]+)"', tool_call_buffer)
                    if name_match:
                        intended_tool_name = name_match.group(1)
                        # Find the schema for the intended tool in the original payload
                        available_tools = original_payload.get("tools", [])
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
                
                sys_msg_idx = next((i for i, m in enumerate(follow_up_payload["messages"]) if m["role"] == "system"), None)
                if sys_msg_idx is not None:
                    base_sys = follow_up_payload["messages"][sys_msg_idx]["content"]
                    # Strip previous mode instructions
                    base_sys = re.sub(r"\[COGNITIVE MODE: .*?\]\n", "", base_sys)
                    
                    if is_router_mode:
                        follow_up_payload["messages"][sys_msg_idx]["content"] = "[COGNITIVE MODE: ROUTER]\nPick exactly one tool to use next. Do not provide any explanations or <think> blocks. Output only the tool call.\n" + base_sys
                        follow_up_payload["max_tokens"] = min(follow_up_payload.get("max_tokens", 2048), 512)
                        print(f"[Agentic Bridge] Switching to ROUTER MODE (Hop {recursive_hops})")
                        telemetry = {"type": "telemetry", "event": "mode_switch", "details": f"Hop {recursive_hops}: Switching to ROUTER MODE. Freezing deep layers to save VRAM."}
                        yield f"data: {json.dumps(telemetry)}\n\n".encode("utf-8")
                    else:
                        follow_up_payload["messages"][sys_msg_idx]["content"] = "[COGNITIVE MODE: REASONING]\nThink step-by-step using <think> blocks before acting. Evaluate the previous tool results carefully.\n" + base_sys
                        follow_up_payload["max_tokens"] = max(follow_up_payload.get("max_tokens", 2048), 2048)
                        print(f"[Agentic Bridge] Switching to REASONING MODE (Hop {recursive_hops})")
                        telemetry = {"type": "telemetry", "event": "mode_switch", "details": f"Hop {recursive_hops}: Switching to REASONING MODE. Thawing deep layers for complex thought."}
                        yield f"data: {json.dumps(telemetry)}\n\n".encode("utf-8")
                # -----------------------------

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
