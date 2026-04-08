import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas import AgentOrchestrateRequest, ChatCompletionRequest
from app.services.coalescer import embedding_coalescer
from app.services.pool import connection_pool
from app.services.streaming import stream_generator
from app.services.context_builder import enforce_context_window, map_model_name
import os
import json

router = APIRouter(prefix="/v1", tags=["Agent"])

OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "mock_key")

@router.post("/agent/orchestrate")
async def orchestrate_agent(request: AgentOrchestrateRequest):
    # For demonstration of TaskGroup, we will run embedding and chat completion in parallel
    last_user_message = next((m.content for m in reversed(request.messages) if m.role == "user"), None)
    
    chat_payload = request.model_dump(exclude_none=True)
    chat_payload["model"] = map_model_name(chat_payload.get("model", ""))
    context_limit = chat_payload.pop("contextWindow", 16000)
    chat_payload["messages"] = enforce_context_window(chat_payload.get("messages", []), max_tokens=context_limit)
    
    async def get_embedding():
        if not last_user_message:
            return None
        # Using a default embedding model
        return await embedding_coalescer.get_embedding(last_user_message, "text-embedding-ada-002")
        
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
                    f"{OPENAI_BASE_URL}/chat/completions",
                    json=chat_payload,
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
                    f"{OPENAI_BASE_URL}/chat/completions",
                    json=chat_payload,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()

    try:
        # Use TaskGroup to run both concurrently
        async with asyncio.TaskGroup() as tg:
            embedding_task = tg.create_task(get_embedding())
            chat_task = tg.create_task(get_chat_completion())
            
        embedding_result = embedding_task.result()
        chat_result = chat_task.result()
        
        if request.stream:
            # We return the streaming response, the embedding could be logged or sent as a leading event
            # For simplicity, we just return the stream.
            return StreamingResponse(
                stream_generator(chat_result),
                media_type="text/event-stream"
            )
        else:
            # Combine them in a custom response or just return chat
            return {
                "chat_completion": chat_result,
                "context_embedding": embedding_result
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
