from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
import time
from app.schemas import ChatCompletionRequest
from app.services.pool import connection_pool, ACTIVE_CONNECTIONS
from app.services.agent_service import intercept_and_execute_tools
from app.services.context_builder import enforce_context_window, map_model_name
from app.core.settings import settings
import httpx

router = APIRouter(prefix="/v1", tags=["Chat"])

@router.post("/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    client = connection_pool.get_client("openai")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Forward the payload
    payload = request.model_dump(exclude_none=True, by_alias=True)
    
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
        logger.warning("model_validation_failed", error=str(e))
    
    # Context window engineering: Enforce tokens and preserve system prompt
    context_limit = payload.pop("contextWindow", 16000)
    payload["messages"] = enforce_context_window(payload.get("messages", []), max_tokens=context_limit)

    # --- Cognitive Mode Switch (Initial Hop) ---
    if "tools" in payload and payload["tools"]:
        sys_msg_idx = next((i for i, m in enumerate(payload["messages"]) if m["role"] == "system"), None)
        if sys_msg_idx is not None:
            base_sys = payload["messages"][sys_msg_idx]["content"]
            payload["messages"][sys_msg_idx]["content"] = "[COGNITIVE MODE: ROUTER]\nPick exactly one tool to use next. Do not provide any explanations or <think> blocks. Output only the tool call.\n" + base_sys
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
            
            # Use the agentic interceptor for streaming
            return StreamingResponse(
                intercept_and_execute_tools(response, payload, request.messages),
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
