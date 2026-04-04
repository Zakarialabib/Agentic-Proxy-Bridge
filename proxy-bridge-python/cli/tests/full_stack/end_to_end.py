"""Full-stack integration tests - end-to-end workflow testing."""

import time
import json
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_end_to_end_tests(base_url: str, model: str) -> dict:
    """Run end-to-end integration tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("full_conversation", _test_full_conversation),
        ("preset_workflow", _test_preset_workflow),
        ("hardware_aware_workflow", _test_hardware_aware_workflow),
        ("multi_turn_workflow", _test_multi_turn_workflow),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running end-to-end tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} end-to-end tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_full_conversation(base_url: str, model: str) -> dict:
    """Test a full conversation flow from start to finish."""
    conversation = [
        {"role": "user", "content": "Hello! Can you help me with a coding question?"},
        {"role": "assistant", "content": "Of course! I'd be happy to help with your coding question. What would you like to know?"},
        {"role": "user", "content": "How do I reverse a string in Python?"},
    ]

    messages = []
    total_tokens = 0
    start = time.time()

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            for turn in conversation:
                messages.append({"role": turn["role"], "content": turn["content"]})

                if turn["role"] == "user":
                    resp = await client.post(
                        f"{base_url}/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": messages.copy(),
                            "stream": False,
                            "max_tokens": 200,
                        },
                    )

                    if resp.status_code == 200:
                        data = resp.json()
                        assistant_msg = data.get("choices", [{}])[0].get("message", {})
                        messages.append(assistant_msg)
                        usage = data.get("usage", {})
                        total_tokens += usage.get("total_tokens", 0)
                    else:
                        return {"ok": False, "status_code": resp.status_code, "turn": turn["content"][:50]}

        duration_ms = (time.time() - start) * 1000
        return {
            "ok": True,
            "turns": len(conversation),
            "total_messages": len(messages),
            "total_tokens": total_tokens,
            "duration_ms": round(duration_ms, 2),
            "final_response": messages[-1].get("content", "")[:100] if messages else "",
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_preset_workflow(base_url: str, model: str) -> dict:
    """Test creating and using a preset configuration."""
    preset_config = {
        "name": f"test-preset-{int(time.time())}",
        "description": "Test preset for end-to-end workflow",
        "config": {
            "temperature": 0.5,
            "max_tokens": 150,
            "top_p": 0.9,
            "system_prompt": "You are a helpful coding assistant.",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            create_resp = await client.post(
                f"{base_url}/api/presets",
                json=preset_config,
            )

            if create_resp.status_code not in (200, 201):
                return {"ok": False, "status_code": create_resp.status_code, "step": "create_preset"}

            preset_data = create_resp.json()
            preset_id = preset_data.get("id", preset_data.get("name"))

            list_resp = await client.get(f"{base_url}/api/presets")
            if list_resp.status_code != 200:
                return {"ok": False, "status_code": list_resp.status_code, "step": "list_presets"}

            presets = list_resp.json()
            preset_found = any(p.get("name") == preset_config["name"] for p in (presets if isinstance(presets, list) else presets.get("presets", [])))

            chat_resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": preset_config["config"]["system_prompt"]},
                        {"role": "user", "content": "What is a variable?"},
                    ],
                    "stream": False,
                    "temperature": preset_config["config"]["temperature"],
                    "max_tokens": preset_config["config"]["max_tokens"],
                },
            )

            if chat_resp.status_code == 200:
                data = chat_resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {
                    "ok": True,
                    "preset_created": True,
                    "preset_found_in_list": preset_found,
                    "chat_with_preset": True,
                    "response_length": len(content),
                }
            return {"ok": False, "status_code": chat_resp.status_code, "step": "chat"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_hardware_aware_workflow(base_url: str, model: str) -> dict:
    """Test hardware detection and hardware-aware configuration."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            hardware_resp = await client.get(f"{base_url}/api/hardware/profile")

            if hardware_resp.status_code != 200:
                return {"ok": False, "status_code": hardware_resp.status_code, "step": "get_hardware"}

            hardware = hardware_resp.json()
            gpu_name = hardware.get("gpu_name", "Unknown")
            ram_gb = hardware.get("system_ram_gb", 0)

            memory_resp = await client.get(f"{base_url}/api/hardware/memory")
            memory = memory_resp.json() if memory_resp.status_code == 200 else {}

            status_resp = await client.get(f"{base_url}/api/status")
            status = status_resp.json() if status_resp.status_code == 200 else {}

            chat_resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": f"System has {ram_gb}GB RAM and GPU: {gpu_name}. Recommend optimal settings."},
                        {"role": "user", "content": "What are the optimal settings for my hardware?"},
                    ],
                    "stream": False,
                    "max_tokens": 200,
                },
            )

            if chat_resp.status_code == 200:
                data = chat_resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {
                    "ok": True,
                    "hardware_detected": {
                        "gpu": gpu_name,
                        "ram_gb": ram_gb,
                    },
                    "hardware_aware_response": True,
                    "response_length": len(content),
                }
            return {"ok": False, "status_code": chat_resp.status_code, "step": "chat"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_multi_turn_workflow(base_url: str, model: str) -> dict:
    """Test a multi-turn conversation with context retention."""
    turns = [
        "My name is Alice and I'm learning Python.",
        "What's my name and what am I learning?",
        "Can you give me a simple Python exercise related to what I'm learning?",
    ]

    messages = []
    context_retained = []
    start = time.time()

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            for i, prompt in enumerate(turns):
                messages.append({"role": "user", "content": prompt})

                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": messages.copy(),
                        "stream": False,
                        "max_tokens": 200,
                    },
                )

                if resp.status_code == 200:
                    data = resp.json()
                    assistant_msg = data.get("choices", [{}])[0].get("message", {})
                    messages.append(assistant_msg)
                    content = assistant_msg.get("content", "").lower()

                    if i == 1:
                        context_retained.append("alice" in content or "Alice" in content)
                        context_retained.append("python" in content)
                    elif i == 2:
                        context_retained.append("python" in content or "exercise" in content)
                else:
                    return {"ok": False, "status_code": resp.status_code, "turn": i}

        duration_ms = (time.time() - start) * 1000
        context_score = sum(context_retained) / len(context_retained) if context_retained else 0

        return {
            "ok": context_score >= 0.5,
            "turns": len(turns),
            "context_retained": context_retained,
            "context_score": round(context_score, 2),
            "duration_ms": round(duration_ms, 2),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


def print_end_to_end_summary(results: dict):
    """Print a formatted summary of end-to-end test results."""
    table = Table(title="End-to-End Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Metric", style="yellow")
    table.add_column("Value", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"

        if name == "full_conversation":
            metric = "Turns"
            value = str(result.get("turns", "N/A"))
        elif name == "preset_workflow":
            metric = "Workflow"
            value = "Complete" if result.get("chat_with_preset") else "Incomplete"
        elif name == "hardware_aware_workflow":
            metric = "Hardware"
            value = str(result.get("hardware_detected", {}).get("gpu", "N/A"))
        elif name == "multi_turn_workflow":
            metric = "Context Score"
            value = f"{result.get('context_score', 'N/A')}"
        else:
            metric = "Detail"
            value = str(result.get("detail", "N/A"))[:30]

        table.add_row(name, status, metric, str(value))

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} end-to-end tests passed[/bold]")
