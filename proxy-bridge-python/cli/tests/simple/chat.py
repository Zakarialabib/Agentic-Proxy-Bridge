"""Chat completion tests (streaming and non-streaming)."""

import time

import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

console = Console()


async def run_chat_tests(base_url: str, model: str) -> dict:
    """Run all chat completion tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
    }

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running chat tests...", total=4)

        progress.update(task, description="Non-streaming chat...")
        non_stream = await _test_non_streaming_chat(base_url, model)
        results["tests"]["non_streaming"] = non_stream
        progress.advance(task)

        progress.update(task, description="Streaming chat...")
        stream = await _test_streaming_chat(base_url, model)
        results["tests"]["streaming"] = stream
        progress.advance(task)

        progress.update(task, description="Chat with system prompt...")
        system_prompt = await _test_chat_with_system(base_url, model)
        results["tests"]["with_system_prompt"] = system_prompt
        progress.advance(task)

        progress.update(task, description="Chat with max_tokens limit...")
        max_tokens = await _test_chat_max_tokens(base_url, model)
        results["tests"]["max_tokens_limit"] = max_tokens
        progress.advance(task)

    all_ok = all(t.get("ok", False) for t in results["tests"].values())
    results["ok"] = all_ok

    ns_latency = non_stream.get("latency_ms", 0)
    s_latency = stream.get("latency_ms", 0)
    results["detail"] = f"Non-stream={ns_latency:.0f}ms, Stream={s_latency:.0f}ms"

    return results


async def _test_non_streaming_chat(base_url: str, model: str) -> dict:
    """Test non-streaming chat completion."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Say hello in one word."}],
                    "stream": False,
                    "max_tokens": 10,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                choice = data.get("choices", [{}])[0]
                content = choice.get("message", {}).get("content", "")
                usage = data.get("usage", {})
                return {
                    "ok": True,
                    "content": content[:100],
                    "latency_ms": round(duration_ms, 2),
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_streaming_chat(base_url: str, model: str) -> dict:
    """Test streaming chat completion."""
    start = time.time()
    first_token_time = None
    content_chunks = []
    chunk_count = 0

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Count from 1 to 3."}],
                    "stream": True,
                    "max_tokens": 50,
                },
            ) as resp:
                if resp.status_code != 200:
                    return {"ok": False, "status_code": resp.status_code}

                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        import json
                        data = json.loads(data_str)
                        choice = data.get("choices", [{}])[0]
                        delta = choice.get("delta", {})
                        if "content" in delta:
                            if first_token_time is None:
                                first_token_time = time.time()
                            content_chunks.append(delta["content"])
                            chunk_count += 1
                    except Exception:
                        continue

        duration_ms = (time.time() - start) * 1000
        ttft_ms = (first_token_time - start) * 1000 if first_token_time else 0
        full_content = "".join(content_chunks)

        return {
            "ok": True,
            "content": full_content[:100],
            "latency_ms": round(duration_ms, 2),
            "ttft_ms": round(ttft_ms, 2),
            "chunks": chunk_count,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_chat_with_system(base_url: str, model: str) -> dict:
    """Test chat with system prompt."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant that only responds with 'OK'."},
                        {"role": "user", "content": "Hello"},
                    ],
                    "stream": False,
                    "max_tokens": 10,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {
                    "ok": True,
                    "content": content[:100],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_chat_max_tokens(base_url: str, model: str) -> dict:
    """Test chat with max_tokens enforcement."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Write a long paragraph about the history of computing."}],
                    "stream": False,
                    "max_tokens": 20,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                choice = data.get("choices", [{}])[0]
                content = choice.get("message", {}).get("content", "")
                finish_reason = choice.get("finish_reason", "")
                usage = data.get("usage", {})
                return {
                    "ok": True,
                    "content": content[:100],
                    "finish_reason": finish_reason,
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}
