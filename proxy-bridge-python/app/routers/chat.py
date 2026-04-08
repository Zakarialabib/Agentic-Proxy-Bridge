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
    payload["model"] = map_model_name(payload.get("model", ""))
    
    # Context window engineering: Enforce tokens and preserve system prompt
    context_limit = payload.pop("contextWindow", 16000)
    payload["messages"] = enforce_context_window(payload.get("messages", []), max_tokens=context_limit)
    
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
        except Exception as e:
            ACTIVE_CONNECTIONS.dec()
            return JSONResponse(
                status_code=500,
                content={"error": {"message": str(e), "type": "server_error"}}
            )
    else:
        try:
            async with connection_pool.track_connection():
                response = await client.post(
                    f"{settings.lm_studio_base_url}/v1/chat/completions",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                # Standardize fields if missing
                if "object" not in data:
                    data["object"] = "chat.completion"
                if "created" not in data:
                    data["created"] = int(time.time())
                
                return data
        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"error": {"message": str(e), "type": "server_error"}}
            )
