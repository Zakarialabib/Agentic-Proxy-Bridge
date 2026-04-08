"""OpenAI API compatibility tests."""

import time

import httpx
from rich.console import Console

console = Console()


async def run_openai_compat_tests(base_url: str) -> dict:
    """Test OpenAI-compatible API endpoints."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
    }

    from rich.live import Live
    from rich.spinner import Spinner
    
    with Live(Spinner("dots", text=" Running OpenAI Compatibility Suite..."), refresh_per_second=10, transient=True):
        # Test 1: List models (OpenAI format)
        results["tests"]["list_models"] = await _test_list_models(base_url)

        # Test 2: Chat format (strictly check fields)
        results["tests"]["chat_format"] = await _test_chat_format(base_url)

        # Test 3: Streaming format compliance
        results["tests"]["streaming_format"] = await _test_streaming_format(base_url)

        # Test 4: Error handling (invalid model)
        results["tests"]["error_handling"] = await _test_error_handling(base_url)

    all_ok = all(t.get("ok", False) for t in results["tests"].values())
    results["ok"] = all_ok
    results["detail"] = f"{sum(1 for t in results['tests'].values() if t.get('ok'))}/{len(results['tests'])} passed"

    return results


async def _test_list_models(base_url: str) -> dict:
    """Test /v1/models returns OpenAI-compatible format."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(f"{base_url}/v1/models")
            if resp.status_code == 200:
                data = resp.json()
                has_object = "object" in data
                has_data = "data" in data and isinstance(data["data"], list)
                if has_data and len(data["data"]) > 0:
                    first = data["data"][0]
                    has_id = "id" in first
                    has_created = "created" in first
                    has_owned_by = "owned_by" in first
                    return {
                        "ok": has_object and has_data and has_id,
                        "format_compliant": has_object and has_data and has_id and has_created and has_owned_by,
                        "model_count": len(data["data"]),
                    }
                return {"ok": has_object and has_data, "model_count": 0}
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_chat_format(base_url: str) -> dict:
    """Test chat endpoint accepts OpenAI format."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": "test-model",
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": False,
                    "temperature": 0.7,
                    "max_tokens": 10,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                has_id = "id" in data
                has_object = data.get("object") == "chat.completion"
                has_choices = "choices" in data and isinstance(data["choices"], list)
                has_usage = "usage" in data
                has_created = "created" in data
                has_model = "model" in data

                return {
                    "ok": has_choices and len(data["choices"]) > 0,
                    "openai_compliant": has_id and has_object and has_choices and has_created and has_model,
                    "has_usage": has_usage,
                    "details": f"id={has_id}, obj={has_object}, choices={has_choices}, usage={has_usage}, model={has_model}"
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_streaming_format(base_url: str) -> dict:
    """Test streaming returns proper SSE format."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": "test-model",
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": True,
                    "max_tokens": 5,
                },
            ) as resp:
                if resp.status_code != 200:
                    return {"ok": False, "status_code": resp.status_code}

                content_type = resp.headers.get("content-type", "")
                is_sse = "text/event-stream" in content_type or "stream" in content_type

                chunk_count = 0
                has_done = False
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        chunk_count += 1
                        if line.strip() == "data: [DONE]":
                            has_done = True
                            break
                    if chunk_count > 5:
                        break

                return {
                    "ok": chunk_count > 0,
                    "is_sse": is_sse,
                    "chunks_received": chunk_count,
                    "has_done_marker": has_done,
                }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_error_handling(base_url: str) -> dict:
    """Test error responses for invalid requests."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": "nonexistent-model-xyz",
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": False,
                },
            )
            # Should return an error, not crash
            has_error_body = False
            if resp.status_code >= 400:
                try:
                    data = resp.json()
                    has_error_body = "error" in data or "detail" in data
                except Exception:
                    has_error_body = True

            return {
                "ok": resp.status_code >= 400,
                "status_code": resp.status_code,
                "has_error_body": has_error_body,
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}
