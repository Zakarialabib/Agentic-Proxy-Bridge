from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas import ChatCompletionRequest
from app.services.pool import connection_pool
from app.services.streaming import stream_generator
import os

router = APIRouter(prefix="/v1", tags=["Chat"])

# Mock base URL or load from env
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "mock_key")

@router.post("/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    client = connection_pool.get_client("openai")
    
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Forward the payload
    payload = request.model_dump(exclude_none=True)
    
    if request.stream:
        # Create request but don't read the body yet
        req = client.build_request(
            "POST",
            f"{OPENAI_BASE_URL}/chat/completions",
            json=payload,
            headers=headers
        )
        
        try:
            # We must use send with stream=True
            from app.services.pool import ACTIVE_CONNECTIONS
            ACTIVE_CONNECTIONS.inc()
            try:
                response = await client.send(req, stream=True)
                try:
                    response.raise_for_status()
                except Exception as e:
                    await response.aclose()
                    raise e
                return StreamingResponse(
                    stream_generator(response),
                    media_type="text/event-stream"
                )
            except Exception as e:
                ACTIVE_CONNECTIONS.dec()
                raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        try:
            async with connection_pool.track_connection():
                response = await client.post(
                    f"{OPENAI_BASE_URL}/chat/completions",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
