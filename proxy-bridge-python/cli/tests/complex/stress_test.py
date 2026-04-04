"""Stress tests - tests system limits and stability under load."""

import time
import asyncio
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_stress_tests(base_url: str, model: str) -> dict:
    """Run stress tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("rapid_requests", _test_rapid_requests),
        ("large_payload", _test_large_payload),
        ("long_running", _test_long_running),
        ("memory_pressure", _test_memory_pressure),
        ("connection_stability", _test_connection_stability),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running stress tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Stress testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} stress tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_rapid_requests(base_url: str, model: str) -> dict:
    """Send rapid sequential requests to test rate limiting and stability."""
    count = 20
    success_count = 0
    error_count = 0
    latencies = []

    start = time.time()
    for i in range(count):
        req_start = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": f"Request {i}: Say hi."}],
                        "stream": False,
                        "max_tokens": 10,
                    },
                )
                req_duration_ms = (time.time() - req_start) * 1000
                latencies.append(req_duration_ms)

                if resp.status_code == 200:
                    success_count += 1
                else:
                    error_count += 1
        except Exception:
            error_count += 1

    total_duration_ms = (time.time() - start) * 1000

    return {
        "ok": error_count == 0,
        "total_requests": count,
        "successful": success_count,
        "errors": error_count,
        "total_duration_ms": round(total_duration_ms, 2),
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0,
        "requests_per_second": round(count / (total_duration_ms / 1000), 2) if total_duration_ms > 0 else 0,
    }


async def _test_large_payload(base_url: str, model: str) -> dict:
    """Test handling of large request payloads."""
    sizes = [1000, 5000, 10000]
    results = {}

    for size in sizes:
        large_content = "word " * (size // 5)
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": large_content}],
                        "stream": False,
                        "max_tokens": 50,
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    usage = data.get("usage", {})
                    results[f"size_{size}_chars"] = {
                        "ok": True,
                        "latency_ms": round(duration_ms, 2),
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                    }
                else:
                    results[f"size_{size}_chars"] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[f"size_{size}_chars"] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "sizes_tested": sizes,
        "results": results,
    }


async def _test_long_running(base_url: str, model: str) -> dict:
    """Test sustained operation over time."""
    duration_seconds = 30
    request_count = 0
    error_count = 0
    start = time.time()

    while time.time() - start < duration_seconds:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Say OK."}],
                        "stream": False,
                        "max_tokens": 5,
                    },
                )
                if resp.status_code != 200:
                    error_count += 1
        except Exception:
            error_count += 1
        request_count += 1

    actual_duration = time.time() - start
    return {
        "ok": error_count == 0,
        "target_duration_seconds": duration_seconds,
        "actual_duration_seconds": round(actual_duration, 2),
        "total_requests": request_count,
        "errors": error_count,
        "requests_per_second": round(request_count / actual_duration, 2) if actual_duration > 0 else 0,
    }


async def _test_memory_pressure(base_url: str, model: str) -> dict:
    """Test system behavior under memory pressure with large contexts."""
    contexts = []
    for i in range(5):
        context = f"Document {i}: " + "The system processes data efficiently. " * 200
        contexts.append(context)

    results = {}
    for i, context in enumerate(contexts):
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": "You analyze documents for key insights."},
                            {"role": "user", "content": f"Summarize: {context}"},
                        ],
                        "stream": False,
                        "max_tokens": 100,
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    usage = data.get("usage", {})
                    results[f"context_{i}"] = {
                        "ok": True,
                        "latency_ms": round(duration_ms, 2),
                        "total_tokens": usage.get("total_tokens", 0),
                    }
                else:
                    results[f"context_{i}"] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[f"context_{i}"] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "contexts_processed": len([r for r in results.values() if r.get("ok")]),
        "total_contexts": len(contexts),
        "results": results,
    }


async def _test_connection_stability(base_url: str, model: str) -> dict:
    """Test connection stability with intermittent requests."""
    intervals = [0.1, 0.5, 1.0, 2.0]
    results = {}

    for interval in intervals:
        success_count = 0
        total_count = 5

        for i in range(total_count):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"{base_url}/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": "Hi"}],
                            "stream": False,
                            "max_tokens": 10,
                        },
                    )
                    if resp.status_code == 200:
                        success_count += 1
            except Exception:
                pass

            await asyncio.sleep(interval)

        results[f"interval_{interval}s"] = {
            "ok": success_count == total_count,
            "success_rate": f"{success_count}/{total_count}",
            "interval_seconds": interval,
        }

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "intervals_tested": intervals,
        "results": results,
    }


def print_stress_test_summary(results: dict):
    """Print a formatted summary of stress test results."""
    table = Table(title="Stress Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Metric", style="yellow")
    table.add_column("Value", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"

        if name == "rapid_requests":
            metric = "Requests/sec"
            value = f"{result.get('requests_per_second', 'N/A')}"
        elif name == "large_payload":
            metric = "Sizes tested"
            value = str(result.get("sizes_tested", "N/A"))
        elif name == "long_running":
            metric = "Requests/sec"
            value = f"{result.get('requests_per_second', 'N/A')}"
        elif name == "memory_pressure":
            metric = "Contexts"
            value = f"{result.get('contexts_processed', 0)}/{result.get('total_contexts', 0)}"
        elif name == "connection_stability":
            metric = "Intervals"
            value = str(result.get("intervals_tested", "N/A"))
        else:
            metric = "Detail"
            value = str(result.get("detail", "N/A"))[:30]

        table.add_row(name, status, metric, str(value))

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} stress tests passed[/bold]")
