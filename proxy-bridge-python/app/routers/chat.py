from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
import time
from app.schemas import ChatCompletionRequest
from app.services.pool import connection_pool, ACTIVE_CONNECTIONS
from app.services.agent_service import intercept_and_execute_tools, normalize_system_prompt_and_tools
from app.services.context_builder import enforce_context_window, map_model_name
from app.core.settings import settings
import httpx

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
        models_resp = await client.get(f"{settings.lm_studio_base_url}/v1/models")
        if models_resp.status_code == 200:
            available_models = [m["id"] for m in models_resp.json().get("data", [])]
            if mapped_model not in available_models and mapped_model != "test-model":
                return JSONResponse(
                    status_code=404,
                    content={"error": {"message": f"Model '{mapped_model}' not found", "type": "invalid_request_error", "code": "model_not_found"}}
                )
    except Exception as e:
        print(f"[Chat] model_validation_failed: {str(e)}")
    
    # Context window engineering: Enforce tokens and preserve system prompt
    context_limit = payload.pop("contextWindow", payload.pop("context_window", 16000))
    
    # Normalize system prompt to index 0, strip timestamps, and serialize tools to XML
    tools_list = payload.get("tools")
    payload["messages"] = normalize_system_prompt_and_tools(payload.get("messages", []), tools_list)
    if "tools" in payload:
        del payload["tools"]

    payload["messages"] = enforce_context_window(payload.get("messages", []), max_tokens=context_limit)

    if payload.get("max_tokens") is None:
        payload["max_tokens"] = min(max(context_limit // 2, 512), max(context_limit, 512))

    # --- Cognitive Mode Switch (Initial Hop) ---
    if tools_list:
        payload["messages"].append({
            "role": "user",
            "content": "[COGNITIVE MODE: ROUTER]\nPick exactly one tool to use next. Do not provide any explanations or <think> blocks. Output only the tool call."
        })
        payload["max_tokens"] = min(payload.get("max_tokens", 2048), 512)
        print("[Agentic Bridge] Initial Request: Switching to ROUTER MODE")
    # ------------------------------------------

    if request.stream:
        ACTIVE_CONNECTIONS.inc()
        try:
            req = client.build_request(
                "POST",
                f"{settings.lm_studio_base_url}/v1/chat/completions",
                json=payload,
                headers=headers
            )
            response = await client.send(req, stream=True)
            response.raise_for_status()
            
            async def stream_with_intercept():
                async for chunk in intercept_and_execute_tools(
                    response,
                    payload,
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
                    f"{settings.lm_studio_base_url}/v1/chat/completions",
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
