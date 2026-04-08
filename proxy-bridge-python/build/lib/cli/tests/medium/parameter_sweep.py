"""Parameter sweep tests - tests model behavior across different parameter configurations."""

import time
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_parameter_sweep_tests(base_url: str, model: str) -> dict:
    """Run parameter sweep tests across temperature, top_p, and max_tokens."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("temperature_sweep", _test_temperature_sweep),
        ("top_p_sweep", _test_top_p_sweep),
        ("max_tokens_sweep", _test_max_tokens_sweep),
        ("combined_parameters", _test_combined_parameters),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running parameter sweep tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} parameter sweep tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_temperature_sweep(base_url: str, model: str) -> dict:
    """Test model responses across different temperature values."""
    temperatures = [0.0, 0.3, 0.5, 0.7, 1.0, 1.5, 2.0]
    results = {}

    for temp in temperatures:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Name 3 colors."}],
                        "stream": False,
                        "temperature": temp,
                        "max_tokens": 50,
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    usage = data.get("usage", {})
                    results[f"temp_{temp}"] = {
                        "ok": True,
                        "content_length": len(content),
                        "content_preview": content[:80],
                        "latency_ms": round(duration_ms, 2),
                        "total_tokens": usage.get("total_tokens", 0),
                    }
                else:
                    results[f"temp_{temp}"] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[f"temp_{temp}"] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "temperatures_tested": temperatures,
        "results": results,
    }


async def _test_top_p_sweep(base_url: str, model: str) -> dict:
    """Test model responses across different top_p values."""
    top_p_values = [0.1, 0.3, 0.5, 0.7, 0.9, 1.0]
    results = {}

    for top_p in top_p_values:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Name 3 animals."}],
                        "stream": False,
                        "temperature": 0.7,
                        "top_p": top_p,
                        "max_tokens": 50,
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    usage = data.get("usage", {})
                    results[f"top_p_{top_p}"] = {
                        "ok": True,
                        "content_length": len(content),
                        "content_preview": content[:80],
                        "latency_ms": round(duration_ms, 2),
                        "total_tokens": usage.get("total_tokens", 0),
                    }
                else:
                    results[f"top_p_{top_p}"] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[f"top_p_{top_p}"] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "top_p_values_tested": top_p_values,
        "results": results,
    }


async def _test_max_tokens_sweep(base_url: str, model: str) -> dict:
    """Test model responses with different max_tokens limits."""
    max_tokens_values = [10, 50, 100, 200, 500]
    results = {}

    for max_tokens in max_tokens_values:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Write a paragraph about artificial intelligence and its impact on society."}],
                        "stream": False,
                        "temperature": 0.7,
                        "max_tokens": max_tokens,
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    usage = data.get("usage", {})
                    finish_reason = data.get("choices", [{}])[0].get("finish_reason", "")
                    results[f"max_tokens_{max_tokens}"] = {
                        "ok": True,
                        "content_length": len(content),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "max_tokens_requested": max_tokens,
                        "finish_reason": finish_reason,
                        "latency_ms": round(duration_ms, 2),
                    }
                else:
                    results[f"max_tokens_{max_tokens}"] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[f"max_tokens_{max_tokens}"] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "max_tokens_tested": max_tokens_values,
        "results": results,
    }


async def _test_combined_parameters(base_url: str, model: str) -> dict:
    """Test model with various combined parameter configurations."""
    configs = [
        {"name": "deterministic", "temperature": 0.0, "top_p": 1.0, "max_tokens": 100},
        {"name": "balanced", "temperature": 0.7, "top_p": 0.9, "max_tokens": 200},
        {"name": "creative", "temperature": 1.0, "top_p": 0.95, "max_tokens": 300},
        {"name": "very_creative", "temperature": 1.5, "top_p": 1.0, "max_tokens": 400},
        {"name": "focused", "temperature": 0.3, "top_p": 0.5, "max_tokens": 150},
    ]

    results = {}

    for config in configs:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Write a short story about a journey to Mars."}],
                        "stream": False,
                        "temperature": config["temperature"],
                        "top_p": config["top_p"],
                        "max_tokens": config["max_tokens"],
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    usage = data.get("usage", {})
                    results[config["name"]] = {
                        "ok": True,
                        "content_length": len(content),
                        "content_preview": content[:100],
                        "total_tokens": usage.get("total_tokens", 0),
                        "latency_ms": round(duration_ms, 2),
                        "config": config,
                    }
                else:
                    results[config["name"]] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[config["name"]] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "configs_tested": len(configs),
        "results": results,
    }


def print_parameter_sweep_summary(results: dict):
    """Print a formatted summary of parameter sweep test results."""
    table = Table(title="Parameter Sweep Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Configurations", style="yellow")
    table.add_column("Details", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"
        configs = str(result.get("temperatures_tested", result.get("top_p_values_tested", result.get("max_tokens_tested", result.get("configs_tested", "N/A")))))
        details = str(result.get("detail", ""))[:40]
        table.add_row(name, status, str(configs)[:30], details)

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} parameter sweep tests passed[/bold]")
