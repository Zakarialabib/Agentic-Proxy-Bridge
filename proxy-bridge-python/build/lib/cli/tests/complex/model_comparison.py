"""Model comparison tests - compares performance across different models."""

import time
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_model_comparison_tests(base_url: str, models: list[str]) -> dict:
    """Run model comparison tests across multiple models."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
        "comparison": {},
    }

    if len(models) < 2:
        return {
            "ok": False,
            "detail": "At least 2 models required for comparison",
            "tests": {},
            "summary": {"passed": 0, "total": 0, "failed": 0},
        }

    tests = [
        ("speed_comparison", _test_speed_comparison),
        ("quality_comparison", _test_quality_comparison),
        ("token_efficiency", _test_token_efficiency),
        ("consistency_comparison", _test_consistency_comparison),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running model comparison tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Comparing {name}...")
            result = await test_func(base_url, models)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} comparison tests completed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_speed_comparison(base_url: str, models: list[str]) -> dict:
    """Compare response speed across models."""
    results = {}

    for model in models:
        latencies = []
        for i in range(3):
            start = time.time()
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        f"{base_url}/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": "Write a 2-sentence summary of AI."}],
                            "stream": False,
                            "max_tokens": 50,
                        },
                    )
                    duration_ms = (time.time() - start) * 1000
                    if resp.status_code == 200:
                        latencies.append(duration_ms)
            except Exception:
                continue

        if latencies:
            results[model] = {
                "ok": True,
                "avg_latency_ms": round(sum(latencies) / len(latencies), 2),
                "min_latency_ms": round(min(latencies), 2),
                "max_latency_ms": round(max(latencies), 2),
                "samples": len(latencies),
            }
        else:
            results[model] = {"ok": False, "detail": "All requests failed"}

    fastest = min((r for r in results.values() if r.get("ok")), key=lambda x: x.get("avg_latency_ms", float("inf")), default=None)
    slowest = max((r for r in results.values() if r.get("ok")), key=lambda x: x.get("avg_latency_ms", 0), default=None)

    return {
        "ok": all(r.get("ok") for r in results.values()),
        "models_tested": list(results.keys()),
        "results": results,
        "fastest_model": None,
        "slowest_model": None,
    }


async def _test_quality_comparison(base_url: str, models: list[str]) -> dict:
    """Compare response quality across models."""
    prompts = [
        "Explain quantum computing in simple terms.",
        "Write a Python function to sort a list using merge sort.",
        "What are the pros and cons of remote work?",
    ]

    results = {}

    for model in models:
        model_results = {}
        for i, prompt in enumerate(prompts):
            start = time.time()
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        f"{base_url}/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": prompt}],
                            "stream": False,
                            "max_tokens": 200,
                        },
                    )
                    duration_ms = (time.time() - start) * 1000

                    if resp.status_code == 200:
                        data = resp.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        usage = data.get("usage", {})
                        model_results[f"prompt_{i}"] = {
                            "ok": True,
                            "content_length": len(content),
                            "total_tokens": usage.get("total_tokens", 0),
                            "latency_ms": round(duration_ms, 2),
                        }
                    else:
                        model_results[f"prompt_{i}"] = {"ok": False, "status_code": resp.status_code}
            except Exception as e:
                model_results[f"prompt_{i}"] = {"ok": False, "error": str(e)}

        results[model] = {
            "ok": all(r.get("ok") for r in model_results.values()),
            "prompts_tested": len(model_results),
            "results": model_results,
        }

    return {
        "ok": all(r.get("ok") for r in results.values()),
        "models_tested": list(results.keys()),
        "results": results,
    }


async def _test_token_efficiency(base_url: str, models: list[str]) -> dict:
    """Compare token efficiency across models."""
    prompt = "Explain the concept of recursion in programming with a simple example."
    results = {}

    for model in models:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "max_tokens": 300,
                    },
                )

                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    usage = data.get("usage", {})
                    prompt_tokens = usage.get("prompt_tokens", 0)
                    completion_tokens = usage.get("completion_tokens", 0)
                    total_tokens = usage.get("total_tokens", 0)

                    results[model] = {
                        "ok": True,
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens,
                        "content_length": len(content),
                        "tokens_per_char": round(total_tokens / len(content), 2) if len(content) > 0 else 0,
                    }
                else:
                    results[model] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[model] = {"ok": False, "error": str(e)}

    return {
        "ok": all(r.get("ok") for r in results.values()),
        "models_tested": list(results.keys()),
        "results": results,
    }


async def _test_consistency_comparison(base_url: str, models: list[str]) -> dict:
    """Test response consistency by asking the same question multiple times."""
    prompt = "What is 2+2? Answer with just the number."
    iterations = 3
    results = {}

    for model in models:
        responses = []
        for i in range(iterations):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"{base_url}/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": prompt}],
                            "stream": False,
                            "temperature": 0.0,
                            "max_tokens": 10,
                        },
                    )

                    if resp.status_code == 200:
                        data = resp.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                        responses.append(content)
            except Exception:
                responses.append(None)

        unique_responses = set(r for r in responses if r is not None)
        consistency = len(unique_responses) == 1 if responses else False

        results[model] = {
            "ok": consistency,
            "responses": responses,
            "unique_responses": len(unique_responses),
            "consistent": consistency,
        }

    return {
        "ok": all(r.get("ok") for r in results.values()),
        "models_tested": list(results.keys()),
        "results": results,
    }


def print_model_comparison_summary(results: dict):
    """Print a formatted summary of model comparison results."""
    table = Table(title="Model Comparison Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Models", style="yellow")
    table.add_column("Details", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"
        models = str(result.get("models_tested", "N/A"))
        details = str(result.get("detail", ""))[:40]
        table.add_row(name, status, str(models)[:30], details)

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} comparison tests completed[/bold]")
