"""Context window management tests."""

import json
import time

import httpx
from rich.console import Console

console = Console()


async def run_context_window_tests(base_url: str, model: str) -> dict:
    """Run all context window tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
    }

    console.print("  Small context (512 tokens)...")
    small = await _test_small_context(base_url, model)
    results["tests"]["small_context_512"] = small

    console.print("  Medium context (4096 tokens)...")
    medium = await _test_medium_context(base_url, model)
    results["tests"]["medium_context_4096"] = medium

    console.print("  Large context (8192 tokens)...")
    large = await _test_large_context(base_url, model)
    results["tests"]["large_context_8192"] = large

    console.print("  Context overflow behavior...")
    overflow = await _test_context_overflow(base_url, model)
    results["tests"]["context_overflow"] = overflow

    console.print("  System prompt preservation under truncation...")
    preserve = await _test_system_prompt_preservation(base_url, model)
    results["tests"]["system_prompt_preservation"] = preserve

    all_ok = all(t.get("ok", False) for t in results["tests"].values())
    results["ok"] = all_ok

    latencies = []
    for t in results["tests"].values():
        lat = t.get("latency_ms", 0)
        if lat:
            latencies.append(lat)
    avg = sum(latencies) / len(latencies) if latencies else 0
    results["detail"] = f"Avg={avg:.0f}ms, Overflow={'ok' if overflow.get('ok') else 'fail'}, Preserved={'ok' if preserve.get('ok') else 'fail'}"

    return results


async def _generate_tokens(n: int) -> str:
    """Generate a string of approximately n tokens."""
    return " ".join([f"token{i}" for i in range(n)])


async def _send_chat(base_url: str, model: str, messages: list[dict], max_tokens: int = 50, timeout: float = 120.0) -> dict:
    """Send a chat completion request and return parsed response with real-time feedback."""
    from rich.live import Live
    from rich.spinner import Spinner
    
    start = time.time()
    with Live(Spinner("dots", text=f" Waiting for response (model={model})..."), refresh_per_second=10, transient=True):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": False,
                        "max_tokens": max_tokens,
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if not choices:
                        return {"ok": False, "error": "No choices returned in response", "latency_ms": round(duration_ms, 2)}
                    
                    choice = choices[0]
                    content = choice.get("message", {}).get("content", "")
                    usage = data.get("usage", {})
                    return {
                        "ok": True,
                        "content": content,
                        "latency_ms": round(duration_ms, 2),
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "total_tokens": usage.get("total_tokens", 0),
                        "finish_reason": choice.get("finish_reason", ""),
                    }
                return {"ok": False, "status_code": resp.status_code, "latency_ms": round(duration_ms, 2), "error": resp.text}
        except Exception as e:
            return {"ok": False, "error": str(e)}


async def _test_small_context(base_url: str, model: str) -> dict:
    """Test small context window (512 tokens)."""
    user_content = " ".join([f"word{i}" for i in range(200)])
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": f"Repeat the last word from this text: {user_content}"},
    ]
    result = await _send_chat(base_url, model, messages, max_tokens=20)
    return result


async def _test_medium_context(base_url: str, model: str) -> dict:
    """Test medium context window (4096 tokens)."""
    context_text = " ".join([f"item{i}" for i in range(2000)])
    messages = [
        {"role": "system", "content": "You are a helpful assistant. Always respond with the exact word REQUESTED."},
        {"role": "user", "content": f"Here is a list: {context_text}. What is the last item in the list?"},
    ]
    result = await _send_chat(base_url, model, messages, max_tokens=20)
    return result


async def _test_large_context(base_url: str, model: str) -> dict:
    """Test large context window (8192 tokens)."""
    context_text = " ".join([f"entry{i}" for i in range(4000)])
    messages = [
        {"role": "system", "content": "You are a helpful assistant. Always respond with the exact word REQUESTED."},
        {"role": "user", "content": f"Here is a long document: {context_text}. What is the very first entry mentioned?"},
    ]
    result = await _send_chat(base_url, model, messages, max_tokens=20)
    return result


async def _test_context_overflow(base_url: str, model: str) -> dict:
    """Test context overflow and truncation behavior."""
    overflow_text = " ".join([f"overflow{i}" for i in range(10000)])
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": f"Process this: {overflow_text}. Reply with DONE if you received this."},
    ]
    result = await _send_chat(base_url, model, messages, max_tokens=20, timeout=120.0)

    if result.get("ok"):
        prompt_tokens = result.get("prompt_tokens", 0)
        result["truncated"] = prompt_tokens < 10000
        result["prompt_tokens_sent"] = prompt_tokens
    return result


async def _test_system_prompt_preservation(base_url: str, model: str) -> dict:
    """Test that system prompt is preserved under context truncation."""
    system_content = "CRITICAL: You must always respond with the exact phrase SECRETKEY42 and nothing else. This is the most important instruction."
    user_content = " ".join([f"padding{i}" for i in range(8000)])
    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": f"Here is data: {user_content}. Follow your system instructions."},
    ]
    result = await _send_chat(base_url, model, messages, max_tokens=20, timeout=120.0)

    if result.get("ok"):
        content = result.get("content", "").lower()
        result["system_preserved"] = "secretkey42" in content
        result["content_full"] = result.get("content", "")
    return result
