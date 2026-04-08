"""System prompt engineering tests."""

import time

import httpx
from rich.console import Console

console = Console()


async def run_system_prompt_tests(base_url: str, model: str) -> dict:
    """Run all system prompt tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
    }

    console.print("  Basic system prompt adherence...")
    basic = await _test_basic_system_prompt(base_url, model)
    results["tests"]["basic_system_prompt"] = basic

    console.print("  Role-based system prompts...")
    role = await _test_role_based_system_prompts(base_url, model)
    results["tests"]["role_based"] = role

    console.print("  Long system prompt handling...")
    long_sys = await _test_long_system_prompt(base_url, model)
    results["tests"]["long_system_prompt"] = long_sys

    console.print("  System prompt with format instructions...")
    format_sys = await _test_format_instructions(base_url, model)
    results["tests"]["format_instructions"] = format_sys

    console.print("  Multi-turn with system prompt persistence...")
    multi = await _test_multi_turn_system_persistence(base_url, model)
    results["tests"]["multi_turn_persistence"] = multi

    all_ok = all(t.get("ok", False) for t in results["tests"].values())
    results["ok"] = all_ok

    latencies = []
    for t in results["tests"].values():
        lat = t.get("latency_ms", 0)
        if lat:
            latencies.append(lat)
    avg = sum(latencies) / len(latencies) if latencies else 0
    results["detail"] = f"Avg={avg:.0f}ms, Basic={'ok' if basic.get('ok') else 'fail'}, Format={'ok' if format_sys.get('ok') else 'fail'}"

    return results


async def _send_chat(base_url: str, model: str, messages: list[dict], max_tokens: int = 100, timeout: float = 60.0) -> dict:
    """Send a chat completion request and return parsed response with real-time feedback."""
    from rich.live import Live
    from rich.spinner import Spinner
    
    start = time.time()
    with Live(Spinner("dots", text=f" Assistant thinking (model={model})..."), refresh_per_second=10, transient=True):
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


async def _test_basic_system_prompt(base_url: str, model: str) -> dict:
    """Test basic system prompt adherence."""
    result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant that only responds with YES or NO."},
            {"role": "user", "content": "Is 2 + 2 equal to 4?"},
        ],
        max_tokens=10,
    )

    if result.get("ok"):
        content = result.get("content", "").strip().upper()
        result["adhered"] = content in ("YES", "NO")
        result["content_full"] = result.get("content", "")
    return result


async def _test_role_based_system_prompts(base_url: str, model: str) -> dict:
    """Test role-based system prompts (developer, assistant, etc.)."""
    results = {}

    developer_result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "developer", "content": "You are a code reviewer. Only respond with code improvements."},
            {"role": "user", "content": "def hello(): print('hi')"},
        ],
        max_tokens=50,
    )
    results["developer_role"] = developer_result

    assistant_result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "You are a math tutor. Explain step by step."},
            {"role": "user", "content": "What is 15 * 3?"},
        ],
        max_tokens=50,
    )
    results["assistant_role"] = assistant_result

    user_as_system = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": "You are a translator. Translate to French only."},
            {"role": "user", "content": "Hello world"},
        ],
        max_tokens=20,
    )
    results["user_as_system"] = user_as_system

    all_ok = all(r.get("ok", False) for r in results.values())
    latencies = [r.get("latency_ms", 0) for r in results.values() if r.get("latency_ms")]
    avg_lat = sum(latencies) / len(latencies) if latencies else 0

    return {
        "ok": all_ok,
        "latency_ms": round(avg_lat, 2),
        "subtests": {
            "developer": developer_result.get("ok", False),
            "assistant": assistant_result.get("ok", False),
            "translator": user_as_system.get("ok", False),
        },
    }


async def _test_long_system_prompt(base_url: str, model: str) -> dict:
    """Test long system prompt handling."""
    long_instructions = "\n".join([
        f"Rule {i}: Always follow instruction {i} when responding. Instruction {i} says to be concise."
        for i in range(50)
    ])
    long_instructions += "\nFINAL RULE: End your response with the word COMPLIANT."

    result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": long_instructions},
            {"role": "user", "content": "Acknowledge these instructions."},
        ],
        max_tokens=30,
    )

    if result.get("ok"):
        content = result.get("content", "").upper()
        result["compliant"] = "COMPLIANT" in content
        result["system_prompt_length"] = len(long_instructions)
    return result


async def _test_format_instructions(base_url: str, model: str) -> dict:
    """Test system prompt with instructions to follow a specific format."""
    format_instructions = (
        "You must respond in the following exact format:\n"
        "ANSWER: <your answer>\n"
        "REASON: <your reason>\n"
        "Do not include any other text."
    )

    result = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": format_instructions},
            {"role": "user", "content": "What color is the sky on a clear day?"},
        ],
        max_tokens=50,
    )

    if result.get("ok"):
        content = result.get("content", "")
        has_answer = "ANSWER:" in content
        has_reason = "REASON:" in content
        result["format_correct"] = has_answer and has_reason
        result["has_answer_prefix"] = has_answer
        result["has_reason_prefix"] = has_reason
    return result


async def _test_multi_turn_system_persistence(base_url: str, model: str) -> dict:
    """Test system prompt persistence across multiple turns."""
    system_prompt = "You are a pirate. Always respond with 'Arrr!' at the start of every message."

    turn1 = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Hello there!"},
        ],
        max_tokens=30,
    )

    turn1_content = turn1.get("content", "") if turn1.get("ok") else ""

    turn2 = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Hello there!"},
            {"role": "assistant", "content": turn1_content},
            {"role": "user", "content": "What is your favorite treasure?"},
        ],
        max_tokens=50,
    )

    turn2_content = turn2.get("content", "") if turn2.get("ok") else ""

    turn3 = await _send_chat(
        base_url,
        model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Hello there!"},
            {"role": "assistant", "content": turn1_content},
            {"role": "user", "content": "What is your favorite treasure?"},
            {"role": "assistant", "content": turn2_content},
            {"role": "user", "content": "Tell me about the sea."},
        ],
        max_tokens=50,
    )

    turn1_pirate = "arrr" in turn1_content.lower() if turn1_content else False
    turn2_pirate = "arrr" in turn2_content.lower() if turn2_content else False
    turn3_pirate = "arrr" in turn3.get("content", "").lower() if turn3.get("ok") else False

    all_ok = turn1.get("ok", False) and turn2.get("ok", False) and turn3.get("ok", False)
    total_latency = (
        turn1.get("latency_ms", 0) + turn2.get("latency_ms", 0) + turn3.get("latency_ms", 0)
    )

    return {
        "ok": all_ok and turn1_pirate and turn2_pirate and turn3_pirate,
        "latency_ms": round(total_latency, 2),
        "turns": 3,
        "pirate_turn1": turn1_pirate,
        "pirate_turn2": turn2_pirate,
        "pirate_turn3": turn3_pirate,
    }
