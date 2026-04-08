"""Streaming behavior tests - validates SSE streaming compliance and performance."""

import time
import json
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_streaming_tests(base_url: str, model: str) -> dict:
    """Run all streaming behavior tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("basic_streaming", _test_basic_streaming),
        ("sse_format", _test_sse_format),
        ("done_marker", _test_done_marker),
        ("first_token_time", _test_first_token_time),
        ("chunk_frequency", _test_chunk_frequency),
        ("content_type", _test_content_type),
        ("streaming_with_system", _test_streaming_with_system),
        ("streaming_max_tokens", _test_streaming_max_tokens),
        ("streaming_temperature", _test_streaming_temperature),
        ("streaming_error_handling", _test_streaming_error_handling),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running streaming tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} streaming tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_basic_streaming(base_url: str, model: str) -> dict:
    """Test basic streaming functionality."""
    start = time.time()
    chunks_received = 0
    content_parts = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Count from 1 to 5."}],
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
                        data = json.loads(data_str)
                        choice = data.get("choices", [{}])[0]
                        delta = choice.get("delta", {})
                        if "content" in delta:
                            content_parts.append(delta["content"])
                            chunks_received += 1
                    except json.JSONDecodeError:
                        continue

        duration_ms = (time.time() - start) * 1000
        full_content = "".join(content_parts)

        return {
            "ok": chunks_received > 0,
            "chunks_received": chunks_received,
            "content_length": len(full_content),
            "duration_ms": round(duration_ms, 2),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_sse_format(base_url: str, model: str) -> dict:
    """Test SSE format compliance."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Say hello."}],
                    "stream": True,
                    "max_tokens": 10,
                },
            ) as resp:
                if resp.status_code != 200:
                    return {"ok": False, "status_code": resp.status_code}

                content_type = resp.headers.get("content-type", "")
                is_sse = "text/event-stream" in content_type.lower() or "stream" in content_type.lower()

                valid_chunks = 0
                invalid_chunks = 0
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data:
                                valid_chunks += 1
                            else:
                                invalid_chunks += 1
                        except json.JSONDecodeError:
                            invalid_chunks += 1
                    if valid_chunks + invalid_chunks > 10:
                        break

                return {
                    "ok": valid_chunks > 0 and is_sse,
                    "is_sse": is_sse,
                    "content_type": content_type,
                    "valid_chunks": valid_chunks,
                    "invalid_chunks": invalid_chunks,
                }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_done_marker(base_url: str, model: str) -> dict:
    """Test that streaming ends with [DONE] marker."""
    try:
        done_received = False
        chunk_count = 0

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": True,
                    "max_tokens": 10,
                },
            ) as resp:
                if resp.status_code != 200:
                    return {"ok": False, "status_code": resp.status_code}

                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        chunk_count += 1
                        if line.strip() == "data: [DONE]":
                            done_received = True
                            break
                    if chunk_count > 20:
                        break

                return {
                    "ok": done_received,
                    "done_marker_received": done_received,
                    "total_chunks": chunk_count,
                }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_first_token_time(base_url: str, model: str) -> dict:
    """Test time to first token (TTFT)."""
    start = time.time()
    first_token_time = None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hello"}],
                    "stream": True,
                    "max_tokens": 20,
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
                        data = json.loads(data_str)
                        choice = data.get("choices", [{}])[0]
                        delta = choice.get("delta", {})
                        if "content" in delta and first_token_time is None:
                            first_token_time = time.time()
                            break
                    except json.JSONDecodeError:
                        continue

        ttft_ms = (first_token_time - start) * 1000 if first_token_time else 0
        total_ms = (time.time() - start) * 1000

        return {
            "ok": first_token_time is not None,
            "ttft_ms": round(ttft_ms, 2),
            "total_ms": round(total_ms, 2),
            "rating": "excellent" if ttft_ms < 100 else "good" if ttft_ms < 500 else "acceptable" if ttft_ms < 2000 else "poor",
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_chunk_frequency(base_url: str, model: str) -> dict:
    """Test chunk arrival frequency."""
    start = time.time()
    chunk_times = []
    content_chunks = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Write a short paragraph about AI."}],
                    "stream": True,
                    "max_tokens": 100,
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
                        data = json.loads(data_str)
                        choice = data.get("choices", [{}])[0]
                        delta = choice.get("delta", {})
                        if "content" in delta:
                            chunk_times.append(time.time() - start)
                            content_chunks.append(delta["content"])
                    except json.JSONDecodeError:
                        continue

        if len(chunk_times) < 2:
            return {"ok": False, "detail": "Not enough chunks to measure frequency"}

        intervals = [chunk_times[i+1] - chunk_times[i] for i in range(len(chunk_times)-1)]
        avg_interval = sum(intervals) / len(intervals)
        total_duration = chunk_times[-1] - chunk_times[0]
        chunks_per_sec = len(chunk_times) / total_duration if total_duration > 0 else 0

        return {
            "ok": True,
            "total_chunks": len(chunk_times),
            "avg_interval_ms": round(avg_interval * 1000, 2),
            "chunks_per_sec": round(chunks_per_sec, 2),
            "total_duration_ms": round(total_duration * 1000, 2),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_content_type(base_url: str, model: str) -> dict:
    """Test response content-type header."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": True,
                    "max_tokens": 5,
                },
            ) as resp:
                content_type = resp.headers.get("content-type", "")
                is_sse = "text/event-stream" in content_type.lower()

                return {
                    "ok": is_sse,
                    "content_type": content_type,
                    "is_sse": is_sse,
                }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_streaming_with_system(base_url: str, model: str) -> dict:
    """Test streaming with system prompt."""
    start = time.time()
    content_parts = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant that only responds with 'OK'."},
                        {"role": "user", "content": "Hello"},
                    ],
                    "stream": True,
                    "max_tokens": 10,
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
                        data = json.loads(data_str)
                        choice = data.get("choices", [{}])[0]
                        delta = choice.get("delta", {})
                        if "content" in delta:
                            content_parts.append(delta["content"])
                    except json.JSONDecodeError:
                        continue

        duration_ms = (time.time() - start) * 1000
        full_content = "".join(content_parts).lower()

        return {
            "ok": True,
            "content": full_content[:100],
            "follows_system_prompt": "ok" in full_content,
            "duration_ms": round(duration_ms, 2),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_streaming_max_tokens(base_url: str, model: str) -> dict:
    """Test streaming respects max_tokens limit."""
    max_tokens = 10
    chunks_received = 0

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Write a long essay about the history of computing."}],
                    "stream": True,
                    "max_tokens": max_tokens,
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
                        data = json.loads(data_str)
                        choice = data.get("choices", [{}])[0]
                        if choice.get("finish_reason") == "length":
                            break
                        delta = choice.get("delta", {})
                        if "content" in delta:
                            chunks_received += 1
                    except json.JSONDecodeError:
                        continue

                return {
                    "ok": True,
                    "chunks_received": chunks_received,
                    "max_tokens_requested": max_tokens,
                    "stopped_at_limit": chunks_received <= max_tokens * 2,
                }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_streaming_temperature(base_url: str, model: str) -> dict:
    """Test streaming with different temperature values."""
    results = {}

    for temp in [0.0, 0.5, 1.0]:
        start = time.time()
        content_parts = []

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Tell me a creative story."}],
                        "stream": True,
                        "temperature": temp,
                        "max_tokens": 50,
                    },
                ) as resp:
                    if resp.status_code != 200:
                        results[f"temp_{temp}"] = {"ok": False, "status_code": resp.status_code}
                        continue

                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            choice = data.get("choices", [{}])[0]
                            delta = choice.get("delta", {})
                            if "content" in delta:
                                content_parts.append(delta["content"])
                        except json.JSONDecodeError:
                            continue

            duration_ms = (time.time() - start) * 1000
            full_content = "".join(content_parts)
            results[f"temp_{temp}"] = {
                "ok": True,
                "content_length": len(full_content),
                "duration_ms": round(duration_ms, 2),
            }
        except Exception as e:
            results[f"temp_{temp}"] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "temperatures_tested": list(results.keys()),
        "results": results,
    }


async def _test_streaming_error_handling(base_url: str, model: str) -> dict:
    """Test streaming error handling with invalid model."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                json={
                    "model": "nonexistent-model-xyz-123",
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": True,
                },
            ) as resp:
                has_error = resp.status_code >= 400
                error_body = None
                if has_error:
                    try:
                        error_body = resp.json()
                    except Exception:
                        error_body = {"raw": await resp.aread()}

                return {
                    "ok": has_error,
                    "status_code": resp.status_code,
                    "has_error_body": error_body is not None,
                }
    except Exception as e:
        return {"ok": False, "error": str(e)}


def print_streaming_summary(results: dict):
    """Print a formatted summary of streaming test results."""
    table = Table(title="Streaming Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Details", style="yellow")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"
        details = str(result.get("detail", ""))[:50]
        if "ttft_ms" in result:
            details = f"TTFT: {result['ttft_ms']:.0f}ms"
        elif "chunks_received" in result:
            details = f"Chunks: {result['chunks_received']}"
        table.add_row(name, status, details)

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} streaming tests passed[/bold]")
