from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
import time
from app.schemas import ChatCompletionRequest
from app.services.pool import connection_pool, ACTIVE_CONNECTIONS
from app.services.agent_service import (
    intercept_and_execute_tools,
    normalize_system_prompt_and_tools,
    build_orchestration_system_prompt,
    prioritize_tools_for_mode,
    build_orchestration_profile,
)
from app.services.context_builder import enforce_context_window, map_model_name
from app.services.trigger_rules import match_triggers
from app.services.context_strategy import apply_context_strategy
from app.services.tool_service import tool_registry
from app.core.settings import settings
import httpx
import json
import os

router = APIRouter(prefix="/v1", tags=["Chat"])

def _normalize_generation_payload(payload: dict) -> dict:
    payload = dict(payload)
    if payload.get("max_tokens") is None:
        for key in ("maxTokens", "max_completion_tokens", "maxCompletionTokens"):
            if payload.get(key) is not None:
                payload["max_tokens"] = payload[key]
                break
    if payload.get("contextWindow") is None and payload.get("context_window") is not None:
        payload["contextWindow"] = payload["context_window"]
    if payload.get("thinking") is None:
        for key in ("enableReasoning", "reasoning", "thinkingMode"):
            if payload.get(key) is not None:
                payload["thinking"] = payload[key]
                break
    return payload


async def _apply_orchestration_features(payload: dict, tools_list: list | None) -> dict:
    """
    Apply orchestration features when tools are provided.
    Returns the enhanced payload.
    """
    if not tools_list:
        # No tools - pure passthrough mode
        return payload
    
    # Extract orchestration parameters from payload
    orchestration_mode = payload.get("orchestration_mode")
    max_steps = payload.get("max_steps")
    tool_budget = payload.get("tool_budget")
    context_strategy = payload.get("context_strategy")
    
    # Get last user message for trigger matching
    messages = payload.get("messages", [])
    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, dict) and msg.get("role") == "user":
            last_user_message = msg.get("content", "")
            break
    
    # Match trigger rules for orchestration recommendations
    # Convert message content to string (can be str | dict | list)
    msg_content = str(last_user_message) if last_user_message else ""
    trigger_profile = match_triggers(msg_content, None)
    recommended = trigger_profile.get("recommended_actions", {})
    
    # Resolve orchestration mode - user provided > trigger recommended > default
    resolved_mode = orchestration_mode
    if not resolved_mode and recommended.get("orchestration_mode"):
        resolved_mode = recommended["orchestration_mode"]
    if not resolved_mode:
        resolved_mode = "adaptive"  # Default orchestration mode
    
    # Resolve max_steps - user provided > trigger recommended > profile default
    resolved_max_steps = max_steps
    if resolved_max_steps is None and recommended.get("max_steps"):
        resolved_max_steps = recommended["max_steps"]
    if resolved_max_steps is None:
        profile = build_orchestration_profile(resolved_mode)
        resolved_max_steps = profile.get("max_steps", 10)
    
    # Resolve tool_budget - user provided > trigger recommended > max_steps
    resolved_tool_budget = tool_budget
    if resolved_tool_budget is None and recommended.get("tool_budget"):
        resolved_tool_budget = recommended["tool_budget"]
    if resolved_tool_budget is None:
        resolved_tool_budget = resolved_max_steps
    
    # Resolve context_strategy - user provided > trigger recommended > default
    resolved_context_strategy = context_strategy
    if not resolved_context_strategy and recommended.get("context_strategy"):
        resolved_context_strategy = recommended["context_strategy"]
    if not resolved_context_strategy:
        resolved_context_strategy = "full"
    
    # Build orchestration system prompt based on mode
    mode_prompt = build_orchestration_system_prompt(resolved_mode, payload.get("model"))
    
    # Inject orchestration prompt into system message
    messages = payload.get("messages", [])
    if messages:
        if messages[0].get("role") == "system":
            base_system = messages[0].get("content", "")
            if mode_prompt not in str(base_system):
                messages[0]["content"] = f"{mode_prompt}\n\n{base_system}".strip()
        else:
            messages = [{"role": "system", "content": mode_prompt}] + messages
    else:
        messages = [{"role": "system", "content": mode_prompt}]
    payload["messages"] = messages
    
    # Prioritize tools based on orchestration mode
    tools = prioritize_tools_for_mode(tools_list, resolved_mode)
    
    # For local_only mode, filter to safe local tools only
    if resolved_mode == "local_only":
        local_names = {tool.get("function", {}).get("name") for tool in tool_registry.list_tools()}
        safe_local = {"file_list", "read_file", "file_read", "write_file", "search_knowledge_base", "query_knowledge_graph", "calculate", "get_current_time"}
        tools = [tool for tool in tools if tool.get("function", {}).get("name") in local_names and tool.get("function", {}).get("name") in safe_local]
        if not tools:
            payload["tool_choice"] = "none"
    
    # Apply preset defaults if present
    try:
        from app.routers.presets import _load_presets_store, _presets_store
        _load_presets_store()
        preset = None
        default_id = _presets_store.get("default_preset")
        if default_id:
            preset = next((p for p in _presets_store.get("presets", []) if p.get("id") == default_id), None)
        if preset is None:
            preset = next((p for p in _presets_store.get("presets", []) if p.get("model_id") == payload.get("model")), None)
        if preset:
            params = preset.get("params", {}) or {}
            for key in ["temperature", "top_p", "min_p", "repeat_penalty", "max_tokens"]:
                if key not in payload and key in params:
                    payload[key] = params[key]
            if "contextWindow" not in payload and "context_window" in params:
                payload["contextWindow"] = params["context_window"]
            if preset.get("system_prompt"):
                messages = payload.get("messages", [])
                if messages and messages[0].get("role") == "system":
                    base_system = messages[0].get("content", "")
                    if preset["system_prompt"] not in str(base_system):
                        messages[0]["content"] = f"{preset['system_prompt']}\n\n{base_system}".strip()
    except Exception as e:
        print(f"[Chat] Preset application failed: {e}")
    
    # Store orchestration metadata in payload for intercept_and_execute_tools
    payload["_orchestration"] = {
        "mode": resolved_mode,
        "max_steps": resolved_max_steps,
        "tool_budget": resolved_tool_budget,
        "context_strategy": resolved_context_strategy,
    }
    
    print(f"[Chat] Orchestration enabled: mode={resolved_mode}, max_steps={resolved_max_steps}, tool_budget={resolved_tool_budget}, context_strategy={resolved_context_strategy}")
    
    return payload


@router.post("/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    client = connection_pool.get_client("openai")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Forward the payload
    payload = request.model_dump(exclude_none=True, by_alias=True)
    payload = _normalize_generation_payload(payload)

    if not payload.get("messages"):
        prompt = request.prompt or request.input
        if prompt:
            payload["messages"] = [{"role": "user", "content": prompt}]
        else:
            return JSONResponse(
                status_code=422,
                content={"error": {"message": "Either 'messages' or 'prompt' is required", "type": "invalid_request_error"}},
            )

    payload.pop("prompt", None)
    payload.pop("input", None)
    
    # Map the model name from custom openclaw format to actual LM Studio model
    mapped_model = map_model_name(payload.get("model", ""))
    payload["model"] = mapped_model
    
    # Explicit Model Validation for OpenAI Compliance
    try:
        models_resp = await client.get(f"{settings.backend_base_url}/v1/models")
        if models_resp.status_code == 200:
            available_models = [m["id"] for m in models_resp.json().get("data", [])]
            if mapped_model not in available_models and mapped_model != "test-model":
                return JSONResponse(
                    status_code=404,
                    content={"error": {"message": f"Model '{mapped_model}' not found", "type": "invalid_request_error", "code": "model_not_found"}}
                )
    except Exception as e:
        print(f"[Chat] model_validation_failed: {str(e)}")
    
    # Extract tools before normalization (needed for orchestration logic)
    tools_list = payload.get("tools")
    
    # Apply orchestration features if tools are provided
    if tools_list:
        payload = await _apply_orchestration_features(payload, tools_list)
        # Extract orchestration metadata for intercept_and_execute_tools
        orchestration_meta = payload.pop("_orchestration", {})
        # Store in payload for the interceptor to use
        payload["_orchestration"] = orchestration_meta
    
    # Context window engineering: Enforce tokens and preserve system prompt
    context_limit = payload.pop("contextWindow", payload.pop("context_window", 16000))
    
    # Normalize system prompt to index 0, strip timestamps, and serialize tools to XML
    payload["messages"] = normalize_system_prompt_and_tools(payload.get("messages", []), tools_list)
    if "tools" in payload:
        del payload["tools"]

    # Get last user message for context strategy
    last_user_message = ""
    for msg in payload.get("messages", []):
        if isinstance(msg, dict) and msg.get("role") == "user":
            last_user_message = msg.get("content", "")
            break
    
    # Apply context strategy if orchestration is enabled
    context_strategy = "full"
    if tools_list and "_orchestration" in payload:
        context_strategy = payload["_orchestration"].get("context_strategy", "full")
    
    payload["messages"] = await apply_context_strategy(
        payload.get("messages", []),
        last_user_message,
        context_strategy,
        context_limit,
    )

    if payload.get("max_tokens") is None:
        payload["max_tokens"] = min(max(context_limit // 2, 512), max(context_limit, 512))

    # --- Cognitive Mode Switch (Initial Hop) ---
    # Only apply router mode hint if tools are provided (orchestration enabled)
    if tools_list:
        payload["messages"].append({
            "role": "user",
            "content": "[COGNITIVE MODE: ROUTER]\nPick exactly one tool to use next. Do not provide any explanations or <think> blocks. Output only the tool call."
        })
        payload["max_tokens"] = min(payload.get("max_tokens", 2048), 512)
        print("[Chat] Initial Request: Switching to ROUTER MODE (orchestration enabled)")
    # ------------------------------------------

    if request.stream:
        ACTIVE_CONNECTIONS.inc()
        try:
            req = client.build_request(
                "POST",
                f"{settings.backend_base_url}/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=httpx.Timeout(600.0, connect=10.0)
            )
            response = await client.send(req, stream=True)
            response.raise_for_status()
            
            # Pass orchestration metadata to interceptor
            intercept_payload = dict(payload)
            if "_orchestration" in payload:
                intercept_payload["max_steps"] = payload["_orchestration"].get("max_steps")
                intercept_payload["tool_budget"] = payload["_orchestration"].get("tool_budget")
                intercept_payload["context_strategy"] = payload["_orchestration"].get("context_strategy")
            
            async def stream_with_intercept():
                async for chunk in intercept_and_execute_tools(
                    response,
                    intercept_payload,
                    payload["messages"]
                ):
                    yield chunk
                    
            return StreamingResponse(
                stream_with_intercept(),
                media_type="text/event-stream"
            )
        except httpx.HTTPStatusError as e:
            ACTIVE_CONNECTIONS.dec()
            status_code = e.response.status_code
            error_data = {"error": {"message": str(e), "type": "invalid_request_error" if status_code < 500 else "server_error"}}
            try:
                # Try to propagate upstream error body if it exists and is JSON
                upstream_json = e.response.json()
                if "error" in upstream_json:
                    error_data = upstream_json
            except:
                pass
            return JSONResponse(status_code=status_code, content=error_data)
        except Exception as e:
            ACTIVE_CONNECTIONS.dec()
            return JSONResponse(
                status_code=500,
                content={"error": {"message": str(e), "type": "server_error"}}
            )
    else:
        start_time = time.time()
        try:
            async with connection_pool.track_connection():
                response = await client.post(
                    f"{settings.backend_base_url}/v1/chat/completions",
                    json=payload,
                    headers=headers
                )
                duration = time.time() - start_time
                print(f"[Chat] {payload.get('model')} request completed in {duration:.2f}s")
                
                response.raise_for_status()
                data = response.json()
                
                # Unified OpenAI Normalization
                normalized = {
                    "id": data.get("id", f"chatcmpl-{int(time.time()*1000)}"),
                    "object": "chat.completion",
                    "created": data.get("created", int(time.time())),
                    "model": data.get("model", payload.get("model", "unknown")),
                    "choices": data.get("choices", []),
                    "usage": data.get("usage", {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0})
                }
                
                # Validation: Ensure choices have message and content
                if not normalized["choices"]:
                    # Fallback if LM Studio returned something weird
                    if "text" in data:
                        normalized["choices"] = [{"message": {"role": "assistant", "content": data["text"]}, "finish_reason": "stop", "index": 0}]
                    else:
                        normalized["choices"] = [{"message": {"role": "assistant", "content": ""}, "finish_reason": "empty", "index": 0}]
                
                duration = time.time() - start_time
                print(f"[Chat] {normalized['model']} -> {len(normalized['choices'])} choices in {duration:.2f}s")
                
                return normalized
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_data = {"error": {"message": str(e), "type": "invalid_request_error" if status_code < 500 else "server_error"}}
            try:
                upstream_json = e.response.json()
                if "error" in upstream_json:
                    error_data = upstream_json
            except:
                pass
            return JSONResponse(status_code=status_code, content=error_data)
        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"error": {"message": str(e), "type": "server_error"}}
            )