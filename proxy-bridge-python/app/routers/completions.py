"""OpenAI-compatible completions endpoint for legacy API support."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import time
import json
import httpx

from app.adapters.lmstudio import LMStudioAdapter
from app.core.settings import settings

router = APIRouter(prefix="/v1", tags=["Completions"])


class CompletionRequest(BaseModel):
    model: str = ""
    prompt: str | List[str]
    max_tokens: int = 16
    temperature: float = 1.0
    top_p: float = 1.0
    n: int = 1
    stream: bool = False
    logprobs: Optional[int] = None
    echo: bool = False
    stop: Optional[str | List[str]] = None
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0
    best_of: int = 1
    logit_bias: Optional[Dict[str, float]] = None
    user: Optional[str] = None
    suffix: Optional[str] = None


@router.post("/completions")
async def create_completion(request: CompletionRequest):
    """Legacy completions endpoint (text-in, text-out)."""
    adapter = LMStudioAdapter(base_url=settings.LMSTUDIO_BASE_URL)
    try:
        messages = [{"role": "user", "content": request.prompt if isinstance(request.prompt, str) else "\n".join(request.prompt)}]

        payload = {
            "model": request.model or settings.CHAT_MODEL,
            "messages": messages,
            "stream": request.stream,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "top_p": request.top_p,
            "n": request.n,
            "presence_penalty": request.presence_penalty,
            "frequency_penalty": request.frequency_penalty,
        }

        if request.stop:
            payload["stop"] = request.stop
        if request.logit_bias:
            payload["logit_bias"] = request.logit_bias
        if request.user:
            payload["user"] = request.user

        if request.stream:
            async def stream_generator():
                try:
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        async with client.stream(
                            "POST",
                            f"{settings.LMSTUDIO_BASE_URL}/v1/chat/completions",
                            json=payload,
                        ) as resp:
                            resp.raise_for_status()
                            async for line in resp.aiter_lines():
                                if line.startswith("data: "):
                                    yield line + "\n\n"
                                elif line.strip():
                                    yield f"data: {line}\n\n"
                            yield "data: [DONE]\n\n"
                except Exception as e:
                    error_data = json.dumps({"error": {"message": str(e), "type": "server_error"}})
                    yield f"data: {error_data}\n\n"

            return StreamingResponse(stream_generator(), media_type="text/event-stream")
        else:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{settings.LMSTUDIO_BASE_URL}/v1/chat/completions",
                    json=payload,
                )
                resp.raise_for_status()
                chat_data = resp.json()

                choices = []
                for i, choice in enumerate(chat_data.get("choices", [])):
                    message = choice.get("message", {})
                    choices.append({
                        "index": i,
                        "text": message.get("content", ""),
                        "logprobs": None,
                        "finish_reason": choice.get("finish_reason", "stop"),
                    })

                usage = chat_data.get("usage", {})
                return {
                    "id": chat_data.get("id", f"cmpl-{int(time.time())}"),
                    "object": "text_completion",
                    "created": chat_data.get("created", int(time.time())),
                    "model": request.model,
                    "choices": choices,
                    "usage": {
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "total_tokens": usage.get("total_tokens", 0),
                    },
                }
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await adapter.close()


@router.get("/completions/models/{model_id}")
async def get_model_details(model_id: str):
    """Get detailed model information."""
    adapter = LMStudioAdapter(base_url=settings.LMSTUDIO_BASE_URL)
    try:
        models = await adapter.list_models()
        model = next((m for m in models if m.get("id") == model_id), None)
        if model:
            return model
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await adapter.close()
