import json
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.adapters.lmstudio import (
    LMStudioAdapter,
    _extract_and_strip_reasoning,
    _parse_qwen_tool_calls,
)
from app.core.settings import settings
from app.schemas import ChatCompletionRequest, ErrorResponse
from app.services.context_builder import enforce_context_window, estimate_tokens, map_model_name

import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/v1", tags=["Chat"])

# Shared adapter instance
_adapter: Optional[LMStudioAdapter] = None


def _get_adapter() -> LMStudioAdapter:
    global _adapter
    if _adapter is None:
        _adapter = LMStudioAdapter(base_url=settings.lm_studio_base_url)
    return _adapter


# =============================================
# Helper Functions
# =============================================


def sanitize_model_id(model_id: str) -> str:
    """Strip provider prefix like 'custom-xxx/' from model ID.

    e.g. 'custom-192-168-1-12-1234/qwen3.5-4b' -> 'qwen3.5-4b'
    """
    return map_model_name(model_id)


def format_openai_streaming_chunk(
    raw_chunk: Dict[str, Any],
    model: str,
    index: int = 0,
) -> Dict[str, Any]:
    """Format a raw LM Studio streaming chunk into OpenAI-compatible SSE event."""
    ts = int(time.time())
    choices = raw_chunk.get("choices", [])
    delta: Dict[str, Any] = {}
    finish_reason = None

    if choices:
        c = choices[0]
        delta_obj = c.get("delta", {})
        if isinstance(delta_obj, dict):
            content = delta_obj.get("content")
            if content is not None:
                delta["content"] = content
            tool_calls = delta_obj.get("tool_calls")
            if tool_calls:
                delta["tool_calls"] = tool_calls
            reasoning = delta_obj.get("reasoning_content")
            if reasoning:
                delta["reasoning_content"] = reasoning
        finish_reason = c.get("finish_reason")

    chunk: Dict[str, Any] = {
        "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion.chunk",
        "created": ts,
        "model": model,
        "choices": [
            {
                "index": index,
                "delta": delta,
                "finish_reason": finish_reason,
            }
        ],
    }

    usage = raw_chunk.get("usage")
    if usage:
        chunk["usage"] = usage

    return chunk


def format_openai_response(
    output: str,
    model: str,
    usage: Optional[Dict[str, Any]] = None,
    tool_calls: Optional[List[Dict[str, Any]]] = None,
    reasoning_content: Optional[str] = None,
    finish_reason: str = "stop",
) -> Dict[str, Any]:
    """Build an OpenAI-compatible chat completion response dict."""
    ts = int(time.time())
    choice: Dict[str, Any] = {
        "index": 0,
        "message": {
            "role": "assistant",
            "content": output,
        },
        "finish_reason": finish_reason,
    }

    if tool_calls:
        choice["message"]["tool_calls"] = tool_calls
        choice["finish_reason"] = "tool_calls"

    if reasoning_content:
        choice["message"]["reasoning_content"] = reasoning_content

    response: Dict[str, Any] = {
        "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": ts,
        "model": model,
        "choices": [choice],
    }

    if usage:
        response["usage"] = usage
    else:
        prompt_tokens = estimate_tokens(output)
        completion_tokens = estimate_tokens(output)
        response["usage"] = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        }

    return response


def _response_to_completion_body(body: Dict[str, Any]) -> Dict[str, Any]:
    """Convert OpenAI Responses API body to chat/completions format."""
    extra_body = dict(body.get("extra_body", {}))
    for key in ("context_docs", "retrieval", "load_model", "mode", "embed_model", "rerank_model"):
        if body.get(key) is not None:
            extra_body[key] = body.get(key)

    reasoning = body.get("reasoning", {})
    if isinstance(reasoning, dict) and reasoning.get("effort") in {"medium", "high"} and "mode" not in extra_body:
        extra_body["mode"] = "think"

    completion_body: Dict[str, Any] = {
        "model": body.get("model", settings.CHAT_MODEL),
        "messages": _responses_input_to_messages(body),
        "stream": bool(body.get("stream", False)),
        "extra_body": extra_body,
    }

    if body.get("max_output_tokens") is not None:
        completion_body["max_tokens"] = body["max_output_tokens"]
    if body.get("temperature") is not None:
        completion_body["temperature"] = body["temperature"]
    if body.get("top_p") is not None:
        completion_body["top_p"] = body["top_p"]
    if body.get("top_k") is not None:
        completion_body["top_k"] = body["top_k"]
    if body.get("repeat_penalty") is not None:
        completion_body["repeat_penalty"] = body["repeat_penalty"]
    if body.get("tools") is not None:
        completion_body["tools"] = body["tools"]
    if body.get("tool_choice") is not None:
        completion_body["tool_choice"] = body["tool_choice"]
    if body.get("response_format") is not None:
        completion_body["response_format"] = body["response_format"]

    return completion_body


def _responses_input_to_messages(body: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse Responses API input into chat messages format."""
    messages: List[Dict[str, Any]] = []
    instructions = body.get("instructions")
    if instructions:
        messages.append({"role": "system", "content": instructions})

    response_input = body.get("input", "")
    if isinstance(response_input, str):
        if response_input.strip():
            messages.append({"role": "user", "content": response_input})
        return messages

    if not isinstance(response_input, list):
        return messages

    for item in response_input:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "message":
            role = item.get("role", "user")
            text = _content_to_text(item.get("content", ""))
            if text:
                messages.append({"role": role, "content": text})
            continue
        if item.get("role"):
            text = _content_to_text(item.get("content", ""))
            if text:
                messages.append({"role": item["role"], "content": text})
            continue
        if item.get("type") in {"input_text", "text"}:
            text = item.get("text", "")
            if text:
                messages.append({"role": "user", "content": text})

    return messages


def _content_to_text(content: Any) -> str:
    """Extract text from various content formats."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                parts.append(item.get("text", ""))
            elif isinstance(item, str):
                parts.append(item)
        return " ".join(parts)
    return str(content or "")


def _completion_to_response(
    result: Dict[str, Any],
    request_body: Dict[str, Any],
    retrieval_sources: Optional[list] = None,
) -> Dict[str, Any]:
    """Convert chat/completions result to Responses API format."""
    created_at = int(time.time())
    response_id = f"resp_{uuid.uuid4().hex[:24]}"
    choices = result.get("choices", []) if isinstance(result, dict) else []
    message = choices[0].get("message", {}) if choices else {}
    content = message.get("content", "") if isinstance(message, dict) else ""
    reasoning_content = message.get("reasoning_content", "") if isinstance(message, dict) else ""
    output_items = []
    content_items = []

    if reasoning_content:
        content_items.append({
            "type": "reasoning",
            "text": reasoning_content,
        })
    if content:
        content_items.append({
            "type": "output_text",
            "text": content,
            "annotations": [],
        })
    if content_items:
        output_items.append({
            "id": f"msg_{uuid.uuid4().hex[:24]}",
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": content_items,
        })

    response = {
        "id": response_id,
        "object": "response",
        "created_at": created_at,
        "status": "completed",
        "model": request_body.get("model", settings.CHAT_MODEL),
        "output": output_items,
        "output_text": content,
        "usage": result.get("usage"),
        "metadata": {
            "retrieval_sources": retrieval_sources or [],
            "lmstudio_raw_id": result.get("id"),
        },
    }
    if message.get("tool_calls"):
        response["tool_calls"] = message["tool_calls"]
    return response


# =============================================
# POST /v1/chat/completions
# =============================================


@router.post("/chat/completions")
async def create_chat_completion(request: Request):
    start_time = time.time()

    try:
        body = await request.json()
    except Exception as e:
        logger.error("invalid_request_body", error=str(e))
        return _error_response(
            message="Invalid JSON body",
            type="invalid_request_error",
            status_code=400,
        )

    is_streaming = body.get("stream", False)
    model_id = body.get("model", settings.CHAT_MODEL)

    # Sanitize model ID (strip provider prefix)
    sanitized_model = sanitize_model_id(model_id)

    # Extract user content for logging
    user_content = "\n".join(
        _content_to_text(msg.get("content"))
        for msg in body.get("messages", [])
        if msg.get("role") == "user"
    )

    adapter = _get_adapter()

    # Check if model is loaded, auto-load if not
    try:
        if not await adapter.is_model_loaded(sanitized_model):
            logger.info("model_not_loaded_auto_loading", model=sanitized_model)
            await adapter.load_model(sanitized_model, config={})
    except Exception as e:
        logger.warning("model_auto_load_failed", model=sanitized_model, error=str(e))

    # Apply routing mode adjustments (from extra_body)
    extra_body = body.get("extra_body", {})
    mode = extra_body.get("mode") if isinstance(extra_body, dict) else None
    if mode == "think":
        body["temperature"] = min(body.get("temperature", 0.7), 0.4)
    elif mode == "architect":
        body["temperature"] = min(body.get("temperature", 0.7), 0.3)
        body["max_tokens"] = min(body.get("max_tokens", 2048), 8192)

    # Update model in body with sanitized version
    body["model"] = sanitized_model

    # Enforce context window
    context_limit = body.pop("contextWindow", body.pop("context_window", 16000))
    body["messages"] = enforce_context_window(body.get("messages", []), max_tokens=context_limit)

    # Record request metadata
    logger.info(
        "chat_completion_request",
        model=sanitized_model,
        stream=is_streaming,
        message_count=len(body.get("messages", [])),
        mode=mode,
    )

    if is_streaming:
        return await _handle_streaming_completion(body, sanitized_model, start_time)
    else:
        return await _handle_non_streaming_completion(body, sanitized_model, start_time)


async def _handle_streaming_completion(
    body: Dict[str, Any],
    model: str,
    start_time: float,
):
    """Handle streaming chat completion via SSE."""
    adapter = _get_adapter()

    async def stream_generator():
        # Emit cognitive routing status
        yield f"event: cognitive_routing\ndata: {json.dumps({'status': 'Processing', 'model': model})}\n\n"

        try:
            async for chunk in adapter.chat_completion_stream(
                messages=body.get("messages", []),
                model=body.get("model", model),
                temperature=body.get("temperature"),
                max_tokens=body.get("max_tokens"),
                tools=body.get("tools"),
                system_prompt=None,
                reasoning="on" if body.get("enable_thinking") else "off",
                **{k: v for k, v in body.items() if k not in (
                    "messages", "model", "temperature", "max_tokens",
                    "tools", "stream", "enable_thinking", "extra_body",
                    "contextWindow", "context_window",
                )},
            ):
                # Extract reasoning from content delta if present
                delta_content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if delta_content:
                    cleaned, reasoning = _extract_and_strip_reasoning(delta_content)
                    if reasoning:
                        chunk["choices"][0]["delta"]["content"] = cleaned
                        chunk["choices"][0]["delta"]["reasoning_content"] = reasoning

                # Check for Qwen XML tool calls in content
                content_val = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if content_val:
                    tool_calls = _parse_qwen_tool_calls(content_val)
                    if tool_calls:
                        chunk["choices"][0]["delta"]["tool_calls"] = tool_calls

                sse_line = f"data: {json.dumps(chunk)}\n\n"
                yield sse_line

        except Exception as e:
            logger.error("streaming_failed", error=str(e))
            error_chunk = {
                "error": {"message": str(e), "type": "proxy_error"},
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"

        yield "data: [DONE]\n\n"

        # Log metrics
        latency_ms = (time.time() - start_time) * 1000
        logger.info(
            "streaming_completed",
            model=model,
            latency_ms=round(latency_ms, 2),
        )

    return StreamingResponse(stream_generator(), media_type="text/event-stream")


async def _handle_non_streaming_completion(
    body: Dict[str, Any],
    model: str,
    start_time: float,
):
    """Handle non-streaming chat completion."""
    adapter = _get_adapter()

    try:
        result = await adapter.chat_completion(
            messages=body.get("messages", []),
            model=body.get("model", model),
            temperature=body.get("temperature"),
            max_tokens=body.get("max_tokens"),
            stream=False,
            tools=body.get("tools"),
            system_prompt=None,
            reasoning="on" if body.get("enable_thinking") else "off",
            **{k: v for k, v in body.items() if k not in (
                "messages", "model", "temperature", "max_tokens",
                "tools", "stream", "enable_thinking", "extra_body",
                "contextWindow", "context_window",
            )},
        )

        # Post-process: extract reasoning and tool calls from content
        choices = result.get("choices", [])
        if choices and len(choices) > 0:
            msg = choices[0].get("message", {})
            if isinstance(msg, dict):
                content = msg.get("content", "")
                if isinstance(content, str):
                    # Extract reasoning from think tags
                    cleaned, reasoning = _extract_and_strip_reasoning(content)
                    if reasoning:
                        msg["content"] = cleaned
                        msg["reasoning_content"] = reasoning

                    # Parse Qwen XML tool calls
                    tool_calls = _parse_qwen_tool_calls(content)
                    if tool_calls:
                        msg["tool_calls"] = tool_calls

        # Record metrics
        latency_ms = (time.time() - start_time) * 1000
        usage = result.get("usage", {})
        logger.info(
            "chat_completion_completed",
            model=model,
            latency_ms=round(latency_ms, 2),
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
        )

        return result

    except Exception as e:
        logger.error("chat_completion_failed", error=str(e))
        return _error_response(
            message=f"LM Studio connection failed: {str(e)}",
            type="proxy_error",
            status_code=502,
        )


# =============================================
# POST /v1/responses
# =============================================


@router.post("/responses")
async def create_response(request: Request):
    start_time = time.time()

    try:
        body = await request.json()
    except Exception as e:
        logger.error("invalid_request_body", error=str(e))
        return _error_response(
            message="Invalid JSON body",
            type="invalid_request_error",
            status_code=400,
        )

    if body.get("stream"):
        raise HTTPException(
            status_code=501,
            detail="Streaming /v1/responses is not implemented yet. Use /v1/chat/completions for streaming.",
        )

    # Convert Responses API body to chat/completions format
    completion_body = _response_to_completion_body(body)
    if not completion_body.get("messages"):
        raise HTTPException(
            status_code=400,
            detail="Responses input did not produce any messages.",
        )

    model_id = completion_body.get("model", settings.CHAT_MODEL)
    sanitized_model = sanitize_model_id(model_id)
    completion_body["model"] = sanitized_model

    # Enforce context window
    context_limit = completion_body.pop("contextWindow", completion_body.pop("context_window", 16000))
    completion_body["messages"] = enforce_context_window(
        completion_body.get("messages", []),
        max_tokens=context_limit,
    )

    # Apply mode adjustments
    extra_body = completion_body.get("extra_body", {})
    mode = extra_body.get("mode") if isinstance(extra_body, dict) else None
    if mode == "think":
        completion_body["temperature"] = min(completion_body.get("temperature", 0.7), 0.4)
    elif mode == "architect":
        completion_body["temperature"] = min(completion_body.get("temperature", 0.7), 0.3)
        completion_body["max_tokens"] = min(completion_body.get("max_tokens", 2048), 8192)

    adapter = _get_adapter()

    # Auto-load model if not loaded
    try:
        if not await adapter.is_model_loaded(sanitized_model):
            logger.info("model_not_loaded_auto_loading", model=sanitized_model)
            await adapter.load_model(sanitized_model, config={})
    except Exception as e:
        logger.warning("model_auto_load_failed", model=sanitized_model, error=str(e))

    logger.info(
        "responses_request",
        model=sanitized_model,
        message_count=len(completion_body.get("messages", [])),
    )

    try:
        result = await adapter.chat_completion(
            messages=completion_body.get("messages", []),
            model=completion_body.get("model", sanitized_model),
            temperature=completion_body.get("temperature"),
            max_tokens=completion_body.get("max_tokens"),
            tools=completion_body.get("tools"),
            stream=False,
            **{k: v for k, v in completion_body.items() if k not in (
                "messages", "model", "temperature", "max_tokens",
                "tools", "stream", "extra_body",
                "contextWindow", "context_window",
            )},
        )

        # Post-process: extract reasoning and tool calls
        choices = result.get("choices", [])
        if choices and len(choices) > 0:
            msg = choices[0].get("message", {})
            if isinstance(msg, dict):
                content = msg.get("content", "")
                if isinstance(content, str):
                    cleaned, reasoning = _extract_and_strip_reasoning(content)
                    if reasoning:
                        msg["content"] = cleaned
                        msg["reasoning_content"] = reasoning

                    tool_calls = _parse_qwen_tool_calls(content)
                    if tool_calls:
                        msg["tool_calls"] = tool_calls

        # Convert to Responses API format
        response = _completion_to_response(result, body)

        # Record metrics
        latency_ms = (time.time() - start_time) * 1000
        usage = result.get("usage", {})
        logger.info(
            "responses_completed",
            model=sanitized_model,
            latency_ms=round(latency_ms, 2),
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error("responses_proxy_failed", error=str(e))
        return _error_response(
            message=f"LM Studio connection failed: {str(e)}",
            type="proxy_error",
            status_code=502,
        )


# =============================================
# Error Response Helper
# =============================================


def _error_response(
    message: str,
    type: str,
    status_code: int = 500,
) -> Any:
    """Return a structured error response and raise HTTPException."""
    from fastapi import HTTPException

    error = ErrorResponse(
        message=message,
        type=type,
    )
    raise HTTPException(status_code=status_code, detail=error.model_dump())
