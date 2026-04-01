from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.schemas import ChatCompletionRequest
from app.services.pool import connection_pool, ACTIVE_CONNECTIONS
from app.services.agent_service import intercept_and_execute_tools
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
    payload = request.model_dump(exclude_none=True)
    
    if request.stream:
        ACTIVE_CONNECTIONS.inc()
        try:
            req = client.build_request(
                "POST",
                f"{settings.lm_studio_base_url}/chat/completions",
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
            raise HTTPException(status_code=500, detail=str(e))
    else:
        try:
            async with connection_pool.track_connection():
                response = await client.post(
                    f"{settings.lm_studio_base_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                # Non-streaming could also use a tool interception loop but 
                # usually users want tools with streaming
                return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
