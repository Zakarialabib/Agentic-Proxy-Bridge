"""Anthropic API compatibility tests."""

import time

import httpx
from rich.console import Console

console = Console()


async def run_anthropic_compat_tests(base_url: str) -> dict:
    """Test Anthropic-compatible API endpoints (via proxy bridge translation)."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
    }

    # Test 1: Messages endpoint (if bridge supports Anthropic format)
    results["tests"]["messages_endpoint"] = await _test_messages_endpoint(base_url)

    # Test 2: Streaming messages
    results["tests"]["streaming_messages"] = await _test_streaming_messages(base_url)

    # Test 3: System prompt handling
    results["tests"]["system_prompt"] = await _test_system_prompt(base_url)

    all_ok = all(t.get("ok", False) for t in results["tests"].values())
    results["ok"] = all_ok
    results["detail"] = f"{sum(1 for t in results['tests'].values() if t.get('ok'))}/{len(results['tests'])} passed"

    return results


async def _test_messages_endpoint(base_url: str) -> dict:
    """Test if bridge has Anthropic-compatible /v1/messages endpoint."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{base_url}/v1/messages",
                json={
                    "model": "test-model",
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "Hi"}],
                },
                headers={"anthropic-version": "2023-06-01"},
            )
            if resp.status_code == 200:
                data = resp.json()
                has_content = "content" in data
                has_role = data.get("role") == "assistant"
                has_model = "model" in data
                has_stop_reason = "stop_reason" in data
                return {
                    "ok": True,
                    "anthropic_format": has_content and has_role and has_model and has_stop_reason,
                    "content_type": type(data.get("content")).__name__,
                }
            return {"ok": False, "status_code": resp.status_code, "note": "Endpoint may not be implemented"}
    except Exception as e:
        return {"ok": False, "error": str(e), "note": "Anthropic format not supported by bridge"}


async def _test_streaming_messages(base_url: str) -> dict:
    """Test streaming in Anthropic format."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/messages",
                json={
                    "model": "test-model",
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": True,
                },
                headers={"anthropic-version": "2023-06-01"},
            ) as resp:
                if resp.status_code != 200:
                    return {"ok": False, "status_code": resp.status_code, "note": "Streaming messages not available"}

                chunk_count = 0
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        chunk_count += 1
                    if chunk_count > 3:
                        break

                return {
                    "ok": chunk_count > 0,
                    "chunks": chunk_count,
                }
    except Exception as e:
        return {"ok": False, "error": str(e), "note": "Streaming messages not available"}


async def _test_system_prompt(base_url: str) -> dict:
    """Test system prompt in Anthropic format."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{base_url}/v1/messages",
                json={
                    "model": "test-model",
                    "max_tokens": 10,
                    "system": "You are a test assistant.",
                    "messages": [{"role": "user", "content": "Hi"}],
                },
                headers={"anthropic-version": "2023-06-01"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "has_content": "content" in data,
                }
            return {"ok": False, "status_code": resp.status_code, "note": "System prompt in Anthropic format not supported"}
    except Exception as e:
        return {"ok": False, "error": str(e), "note": "System prompt test failed"}
