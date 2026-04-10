import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas import AgentOrchestrateRequest, ChatCompletionRequest, TriggerPreviewRequest
from app.services.coalescer import embedding_coalescer
from app.services.pool import connection_pool
from app.services.streaming import stream_generator
from app.services.agent_service import (
    build_orchestration_system_prompt,
    intercept_and_execute_tools,
    prioritize_tools_for_mode,
    normalize_system_prompt_and_tools,
)
from app.services.tool_service import tool_registry
from app.services.context_builder import map_model_name
from app.services.context_strategy import apply_context_strategy
from app.services.trigger_rules import match_triggers
import os
import json
import time
import uuid

router = APIRouter(prefix="/v1", tags=["Agent"])

from app.core.settings import settings

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "mock_key")

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

@router.post("/agent/orchestrate")
async def orchestrate_agent(request: AgentOrchestrateRequest):
    raw_orchestration_mode = (request.orchestration_mode or "adaptive").strip().lower()
    request_messages = request.messages or []
    last_user_message = next((m.content for m in reversed(request_messages) if m.role == "user"), None) or request.prompt or request.input
    
    chat_payload = request.model_dump(exclude_none=True, by_alias=True)
    chat_payload = _normalize_generation_payload(chat_payload)
    chat_payload["model"] = map_model_name(chat_payload.get("model", ""))
    
    if not chat_payload.get("messages"):
        prompt = request.prompt or request.input
        if prompt:
            chat_payload["messages"] = [{"role": "user", "content": prompt}]
        else:
            raise HTTPException(status_code=422, detail="Either 'messages' or 'prompt' is required")
    chat_payload.pop("prompt", None)
    chat_payload.pop("input", None)

    trigger_profile = match_triggers(
        str(last_user_message or ""),
        request.metadata if isinstance(request.metadata, dict) else None,
    )
    recommended = trigger_profile.get("recommended_actions", {})

    orchestration_mode = raw_orchestration_mode
    if not request.orchestration_mode and recommended.get("orchestration_mode"):
        orchestration_mode = recommended["orchestration_mode"]
    context_strategy = request.context_strategy or recommended.get("context_strategy") or "full"
    max_steps = request.max_steps if request.max_steps is not None else recommended.get("max_steps")
    tool_budget = request.tool_budget if request.tool_budget is not None else recommended.get("tool_budget")

    # Shape the prompt and tools for the chosen orchestration mode before preset/context handling.
    mode_prompt = build_orchestration_system_prompt(orchestration_mode, chat_payload.get("model"))
    messages = chat_payload.get("messages", [])
    if messages:
        if messages[0].get("role") == "system":
            base_system = messages[0].get("content", "")
            if mode_prompt not in str(base_system):
                messages[0]["content"] = f"{mode_prompt}\n\n{base_system}".strip()
        else:
            messages = [{"role": "system", "content": mode_prompt}] + messages
    else:
        messages = [{"role": "system", "content": mode_prompt}]
    chat_payload["messages"] = messages

    if chat_payload.get("tools"):
        tools = chat_payload["tools"]
        if request.tools_available:
            allowed = set(request.tools_available)
            tools = [tool for tool in tools if tool.get("function", {}).get("name") in allowed]
        tools = prioritize_tools_for_mode(tools, orchestration_mode)
        if orchestration_mode == "local_only":
            local_names = {tool.get("function", {}).get("name") for tool in tool_registry.list_tools()}
            safe_local = {"file_list", "read_file", "file_read", "write_file", "search_knowledge_base", "query_knowledge_graph", "calculate", "get_current_time"}
            tools = [tool for tool in tools if tool.get("function", {}).get("name") in local_names and tool.get("function", {}).get("name") in safe_local]
            if not tools:
                chat_payload["tool_choice"] = "none"
        chat_payload["tools"] = tools

    # Apply preset defaults if present
    try:
        from app.routers.presets import _load_presets_store, _presets_store
        _load_presets_store()
        preset = None
        default_id = _presets_store.get("default_preset")
        if default_id:
            preset = next((p for p in _presets_store.get("presets", []) if p.get("id") == default_id), None)
        if preset is None:
            preset = next((p for p in _presets_store.get("presets", []) if p.get("model_id") == chat_payload.get("model")), None)
        if preset:
            params = preset.get("params", {}) or {}
            for key in ["temperature", "top_p", "min_p", "repeat_penalty", "max_tokens"]:
                if key not in chat_payload and key in params:
                    chat_payload[key] = params[key]
            if "contextWindow" not in chat_payload and "context_window" in params:
                chat_payload["contextWindow"] = params["context_window"]
            if preset.get("system_prompt"):
                messages = chat_payload.get("messages", [])
                if not messages:
                    chat_payload["messages"] = [{"role": "system", "content": preset["system_prompt"]}]
                elif messages[0].get("role") == "system":
                    base_system = messages[0].get("content", "")
                    if preset["system_prompt"] not in str(base_system):
                        messages[0]["content"] = f"{preset['system_prompt']}\n\n{base_system}".strip()
                else:
                    chat_payload["messages"] = [{"role": "system", "content": preset["system_prompt"]}] + messages
    except Exception as e:
        print(f"[Agentic Bridge] Preset application failed: {e}")

    context_limit = chat_payload.pop("contextWindow", settings.MAX_CONTEXT_LENGTH or 16000)
    if not context_limit:
        context_limit = settings.MAX_CONTEXT_LENGTH or 16000
    
    # Normalize system prompt to index 0, strip timestamps, and serialize tools to XML
    tools_list = chat_payload.get("tools")
    chat_payload["messages"] = normalize_system_prompt_and_tools(chat_payload.get("messages", []), tools_list)
    if "tools" in chat_payload:
        del chat_payload["tools"]

    chat_payload["messages"] = await apply_context_strategy(
        chat_payload.get("messages", []),
        last_user_message or "",
        context_strategy,
        context_limit,
    )

    trace_id = request.trace_id or f"trace_{uuid.uuid4().hex}"
    trace = {
        "trace_id": trace_id,
        "orchestration_mode": orchestration_mode,
        "context_strategy": context_strategy,
        "tools_available": request.tools_available or [],
        "agents_available": request.agents_available or [],
        "max_steps": max_steps or 0,
        "tool_budget": tool_budget or 0,
        "model": chat_payload.get("model"),
        "stream": bool(request.stream),
        "started_at": int(time.time()),
        "metadata": request.metadata or {},
        "trigger_profile": trigger_profile,
    }
    
    async def get_embedding():
        if not last_user_message:
            return None
        # Use configured local embedding model; never fail the chat path on embedding errors.
        try:
            return await asyncio.wait_for(
                embedding_coalescer.get_embedding(last_user_message, settings.EMBED_MODEL),
                timeout=5.0,
            )
        except Exception as e:
            print(f"[Agentic Bridge] Embedding failed: {e}")
            return None
        
    orchestration_only_fields = {
        "tools_available",
        "agents_available",
        "orchestration_mode",
        "context_strategy",
        "max_steps",
        "tool_budget",
        "trace_id",
        "metadata",
        "trigger_profile",
    }
    intercept_payload = dict(chat_payload)
    if max_steps is not None:
        intercept_payload["max_steps"] = max_steps
    if tool_budget is not None:
        intercept_payload["tool_budget"] = tool_budget
    intercept_payload["context_strategy"] = context_strategy
    outbound_payload = {k: v for k, v in chat_payload.items() if k not in orchestration_only_fields}

    async def get_chat_completion():
        client = connection_pool.get_client("openai")
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        if request.stream:
            from app.services.pool import ACTIVE_CONNECTIONS
            ACTIVE_CONNECTIONS.inc()
            try:
                req = client.build_request(
                    "POST",
                    f"{settings.backend_base_url}/v1/chat/completions",
                    json=outbound_payload,
                    headers=headers
                )
                response = await client.send(req, stream=True)
                try:
                    response.raise_for_status()
                except Exception as e:
                    await response.aclose()
                    raise e
                return response
            except Exception as e:
                ACTIVE_CONNECTIONS.dec()
                raise e
        else:
            async with connection_pool.track_connection():
                response = await client.post(
                    f"{settings.backend_base_url}/v1/chat/completions",
                    json=outbound_payload,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()

    try:
        if request.stream:
            chat_result = await get_chat_completion()
            if request.include_embedding:
                asyncio.create_task(get_embedding())
            original_messages = [
                m.model_dump() if hasattr(m, "model_dump") else m
                for m in request_messages
            ]

            async def stream_with_trace():
                yield f"data: {json.dumps({'type': 'telemetry', 'event': 'orchestrate_trace', 'details': json.dumps(trace)})}\n\n".encode("utf-8")
                yield f"data: {json.dumps({'type': 'telemetry', 'event': 'trigger_profile', 'details': json.dumps(trigger_profile)})}\n\n".encode("utf-8")
                async for chunk in intercept_and_execute_tools(
                    chat_result,
                    intercept_payload,
                    chat_payload["messages"],
                    orchestration_mode=orchestration_mode,
                ):
                    yield chunk

            return StreamingResponse(
                stream_with_trace(),
                media_type="text/event-stream"
            )

        chat_result = await get_chat_completion()
        embedding_result = None
        if request.include_embedding:
            embedding_result = await get_embedding()
        return {
            "chat_completion": chat_result,
            "context_embedding": embedding_result,
            "trace": trace,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent/trigger-preview")
async def preview_trigger(request: TriggerPreviewRequest):
    messages = request.messages or []
    last_user_message = None
    for msg in reversed(messages):
        if msg.role == "user":
            last_user_message = msg.content
            break
    last_user_message = last_user_message or request.message or request.prompt or request.input or ""

    trigger_profile = match_triggers(
        str(last_user_message),
        request.metadata if isinstance(request.metadata, dict) else None,
    )
    recommended = trigger_profile.get("recommended_actions", {})

    resolved = {
        "orchestration_mode": request.orchestration_mode or recommended.get("orchestration_mode") or "adaptive",
        "context_strategy": request.context_strategy or recommended.get("context_strategy") or "full",
        "max_steps": request.max_steps if request.max_steps is not None else recommended.get("max_steps"),
        "tool_budget": request.tool_budget if request.tool_budget is not None else recommended.get("tool_budget"),
    }

    return {
        "trigger_profile": trigger_profile,
        "resolved": resolved,
    }
