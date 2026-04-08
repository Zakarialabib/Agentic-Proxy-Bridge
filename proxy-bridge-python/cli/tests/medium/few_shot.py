"""Few-shot learning and pattern adherence tests."""

import json
import time

import httpx
from rich.console import Console

console = Console()


async def run_few_shot_tests(base_url: str, model: str) -> dict:
    """Run all few-shot tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
    }

    console.print("  Zero-shot baseline...")
    zero = await _test_zero_shot(base_url, model)
    results["tests"]["zero_shot"] = zero

    console.print("  One-shot example following...")
    one = await _test_one_shot(base_url, model)
    results["tests"]["one_shot"] = one

    console.print("  Few-shot (3 examples) pattern adherence...")
    few = await _test_few_shot(base_url, model)
    results["tests"]["few_shot_3"] = few

    console.print("  Format compliance (JSON, code, list)...")
    fmt = await _test_format_compliance(base_url, model)
    results["tests"]["format_compliance"] = fmt

    console.print("  Instruction following with examples...")
    inst = await _test_instruction_with_examples(base_url, model)
    results["tests"]["instruction_with_examples"] = inst

    all_ok = all(t.get("ok", False) for t in results["tests"].values())
    results["ok"] = all_ok

    latencies = []
    for t in results["tests"].values():
        lat = t.get("latency_ms", 0)
        if lat:
            latencies.append(lat)
    avg = sum(latencies) / len(latencies) if latencies else 0
    results["detail"] = f"Avg={avg:.0f}ms, Zero={'ok' if zero.get('ok') else 'fail'}, Few={'ok' if few.get('ok') else 'fail'}"

    return results


async def _send_chat(base_url: str, model: str, messages: list[dict], max_tokens: int = 100, timeout: float = 60.0) -> dict:
    """Send a chat completion request and return parsed response with real-time feedback."""
    from rich.live import Live
    from rich.spinner import Spinner
    
    start = time.time()
    with Live(Spinner("dots", text=f" Pattern matching (model={model})..."), refresh_per_second=10, transient=True):
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


async def _test_zero_shot(base_url: str, model: str) -> dict:
    """Test zero-shot baseline (no examples provided)."""
    result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "Classify the sentiment as POSITIVE, NEGATIVE, or NEUTRAL."},
            {"role": "user", "content": "I absolutely love this product, it works perfectly!"},
        ],
        max_tokens=10,
    )

    if result.get("ok"):
        content = result.get("content", "").strip().upper()
        result["correct_classification"] = "POSITIVE" in content
        result["content_full"] = result.get("content", "")
    return result


async def _test_one_shot(base_url: str, model: str) -> dict:
    """Test one-shot example following."""
    result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "Classify the sentiment. Follow the exact format shown."},
            {"role": "user", "content": "This movie was terrible and a waste of time."},
            {"role": "assistant", "content": "NEGATIVE"},
            {"role": "user", "content": "The weather today is quite pleasant and sunny."},
        ],
        max_tokens=10,
    )

    if result.get("ok"):
        content = result.get("content", "").strip().upper()
        result["correct_classification"] = "POSITIVE" in content
        result["followed_format"] = content in ("POSITIVE", "NEGATIVE", "NEUTRAL")
        result["content_full"] = result.get("content", "")
    return result


async def _test_few_shot(base_url: str, model: str) -> dict:
    """Test few-shot (3 examples) pattern adherence."""
    result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "Translate English to French. Follow the pattern exactly."},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Bonjour"},
            {"role": "user", "content": "Goodbye"},
            {"role": "assistant", "content": "Au revoir"},
            {"role": "user", "content": "Thank you"},
            {"role": "assistant", "content": "Merci"},
            {"role": "user", "content": "Good morning"},
        ],
        max_tokens=10,
    )

    if result.get("ok"):
        content = result.get("content", "").strip()
        result["translated"] = "bonjour" in content.lower() or "matin" in content.lower() or "bon" in content.lower()
        result["content_full"] = result.get("content", "")
    return result


async def _test_format_compliance(base_url: str, model: str) -> dict:
    """Test format compliance across JSON, code, and list outputs."""
    json_result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "Always respond with valid JSON only. No explanations."},
            {"role": "user", "content": 'Give me a JSON object with keys "name" (string) and "age" (number) for a person named Alice who is 30.'},
        ],
        max_tokens=50,
    )

    json_valid = False
    if json_result.get("ok"):
        content = json_result.get("content", "").strip()
        try:
            parsed = json.loads(content)
            json_valid = isinstance(parsed, dict) and "name" in parsed and "age" in parsed
        except json.JSONDecodeError:
            json_valid = False
        json_result["valid_json"] = json_valid

    code_result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "Respond with only a Python function. No explanations, no markdown fences."},
            {"role": "user", "content": "Write a function called add that takes two numbers and returns their sum."},
        ],
        max_tokens=50,
    )

    code_valid = False
    if code_result.get("ok"):
        content = code_result.get("content", "").strip()
        code_valid = "def add" in content or "def add(" in content
        code_result["has_function_def"] = code_valid

    list_result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "Respond with a numbered list only. Each item on a new line starting with a number and period."},
            {"role": "user", "content": "List 3 primary colors."},
        ],
        max_tokens=50,
    )

    list_valid = False
    if list_result.get("ok"):
        content = list_result.get("content", "").strip()
        lines = [l.strip() for l in content.split("\n") if l.strip()]
        list_valid = any(l.startswith("1.") for l in lines)
        list_result["has_numbered_list"] = list_valid

    all_ok = json_result.get("ok", False) and code_result.get("ok", False) and list_result.get("ok", False)
    all_valid = json_valid and code_valid and list_valid
    total_latency = (
        json_result.get("latency_ms", 0)
        + code_result.get("latency_ms", 0)
        + list_result.get("latency_ms", 0)
    )

    return {
        "ok": all_ok and all_valid,
        "latency_ms": round(total_latency, 2),
        "json_valid": json_valid,
        "code_valid": code_valid,
        "list_valid": list_valid,
        "subtests": {
            "json_output": json_result.get("ok", False),
            "code_output": code_result.get("ok", False),
            "list_output": list_result.get("ok", False),
        },
    }


async def _test_instruction_with_examples(base_url: str, model: str) -> dict:
    """Test instruction following combined with examples."""
    result = await _send_chat(
        base_url,
        model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Extract the key entities from text. "
                    "Format: ENTITY_TYPE: entity_value\n"
                    "Supported types: PERSON, LOCATION, ORGANIZATION.\n"
                    "Only output entities found in the text."
                ),
            },
            {"role": "user", "content": "Apple was founded by Steve Jobs in Cupertino."},
            {"role": "assistant", "content": "ORGANIZATION: Apple\nPERSON: Steve Jobs\nLOCATION: Cupertino"},
            {"role": "user", "content": "Google hired Sundar Pichai as CEO in Mountain View."},
        ],
        max_tokens=50,
    )

    if result.get("ok"):
        content = result.get("content", "")
        has_org = "ORGANIZATION:" in content and "Google" in content
        has_person = "PERSON:" in content and "Sundar" in content
        has_location = "LOCATION:" in content and "Mountain View" in content
        result["entities_extracted"] = has_org and has_person and has_location
        result["has_org"] = has_org
        result["has_person"] = has_person
        result["has_location"] = has_location
        result["content_full"] = result.get("content", "")
    return result
