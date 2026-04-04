"""Performance benchmark tests - measures throughput, latency, and resource utilization."""

import time
import asyncio
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_performance_benchmark_tests(base_url: str, model: str, iterations: int = 5) -> dict:
    """Run performance benchmark tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("throughput", lambda: _test_throughput(base_url, model, iterations)),
        ("latency_distribution", lambda: _test_latency_distribution(base_url, model, iterations)),
        ("concurrent_requests", lambda: _test_concurrent_requests(base_url, model, 3)),
        ("long_context", lambda: _test_long_context(base_url, model)),
        ("tokens_per_second", lambda: _test_tokens_per_second(base_url, model, iterations)),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running performance benchmarks...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Benchmarking {name}...")
            result = await test_func()
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} benchmarks completed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_throughput(base_url: str, model: str, iterations: int) -> dict:
    """Measure request throughput (requests per second)."""
    latencies = []
    total_tokens = 0

    for i in range(iterations):
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Write a 3-sentence summary of machine learning."}],
                        "stream": False,
                        "max_tokens": 100,
                    },
                )
                duration_ms = (time.time() - start) * 1000
                latencies.append(duration_ms)

                if resp.status_code == 200:
                    data = resp.json()
                    usage = data.get("usage", {})
                    total_tokens += usage.get("total_tokens", 0)
        except Exception:
            continue

    if not latencies:
        return {"ok": False, "detail": "All requests failed"}

    avg_latency = sum(latencies) / len(latencies)
    total_time = sum(latencies) / 1000
    rps = len(latencies) / total_time if total_time > 0 else 0

    return {
        "ok": True,
        "iterations": len(latencies),
        "avg_latency_ms": round(avg_latency, 2),
        "min_latency_ms": round(min(latencies), 2),
        "max_latency_ms": round(max(latencies), 2),
        "p50_latency_ms": round(sorted(latencies)[len(latencies) // 2], 2),
        "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 2),
        "requests_per_second": round(rps, 2),
        "total_tokens": total_tokens,
    }


async def _test_latency_distribution(base_url: str, model: str, iterations: int) -> dict:
    """Measure latency distribution across different prompt lengths."""
    prompt_lengths = [10, 50, 100, 200, 500]
    results = {}

    for length in prompt_lengths:
        prompt = "word " * length
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "max_tokens": 50,
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    usage = data.get("usage", {})
                    results[f"prompt_{length}_words"] = {
                        "ok": True,
                        "latency_ms": round(duration_ms, 2),
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                    }
                else:
                    results[f"prompt_{length}_words"] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[f"prompt_{length}_words"] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "prompt_lengths_tested": prompt_lengths,
        "results": results,
    }


async def _test_concurrent_requests(base_url: str, model: str, concurrency: int) -> dict:
    """Test concurrent request handling."""
    async def make_request(session: httpx.AsyncClient, req_id: int) -> dict:
        start = time.time()
        try:
            resp = await session.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": f"Request {req_id}: Say hello."}],
                    "stream": False,
                    "max_tokens": 20,
                },
            )
            duration_ms = (time.time() - start) * 1000
            return {
                "req_id": req_id,
                "ok": resp.status_code == 200,
                "status_code": resp.status_code,
                "latency_ms": round(duration_ms, 2),
            }
        except Exception as e:
            return {"req_id": req_id, "ok": False, "error": str(e)}

    start = time.time()
    async with httpx.AsyncClient(timeout=30.0) as session:
        tasks = [make_request(session, i) for i in range(concurrency)]
        results_list = await asyncio.gather(*tasks)

    total_duration_ms = (time.time() - start) * 1000
    successful = sum(1 for r in results_list if r.get("ok"))
    latencies = [r.get("latency_ms", 0) for r in results_list if r.get("ok")]

    return {
        "ok": successful == concurrency,
        "concurrency": concurrency,
        "successful": successful,
        "failed": concurrency - successful,
        "total_duration_ms": round(total_duration_ms, 2),
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0,
        "results": results_list,
    }


async def _test_long_context(base_url: str, model: str) -> dict:
    """Test model performance with long context."""
    context_lengths = [1000, 2000, 4000]
    results = {}

    for length in context_lengths:
        context = "The quick brown fox jumps over the lazy dog. " * (length // 44)
        prompt = f"Based on the context above, how many times does the word 'fox' appear? Context: {context}"

        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "max_tokens": 50,
                    },
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    usage = data.get("usage", {})
                    results[f"context_{length}_chars"] = {
                        "ok": True,
                        "latency_ms": round(duration_ms, 2),
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "response": content[:100],
                    }
                else:
                    results[f"context_{length}_chars"] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[f"context_{length}_chars"] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "context_lengths_tested": context_lengths,
        "results": results,
    }


async def _test_tokens_per_second(base_url: str, model: str, iterations: int) -> dict:
    """Measure tokens per second output rate."""
    tps_values = []

    for i in range(iterations):
        start = time.time()
        first_token_time = None
        total_tokens = 0

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Write a detailed paragraph about the history of computing."}],
                        "stream": True,
                        "max_tokens": 200,
                    },
                ) as resp:
                    if resp.status_code != 200:
                        continue

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
                                total_tokens += 1
                        except json.JSONDecodeError:
                            continue

            if first_token_time and total_tokens > 0:
                generation_time = time.time() - first_token_time
                tps = total_tokens / generation_time if generation_time > 0 else 0
                tps_values.append(round(tps, 2))
        except Exception:
            continue

    if not tps_values:
        return {"ok": False, "detail": "Could not measure tokens/sec"}

    return {
        "ok": True,
        "iterations": len(tps_values),
        "avg_tokens_per_sec": round(sum(tps_values) / len(tps_values), 2),
        "min_tokens_per_sec": round(min(tps_values), 2),
        "max_tokens_per_sec": round(max(tps_values), 2),
        "all_tps_values": tps_values,
    }


def print_performance_benchmark_summary(results: dict):
    """Print a formatted summary of performance benchmark results."""
    table = Table(title="Performance Benchmark Summary")
    table.add_column("Benchmark", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Metric", style="yellow")
    table.add_column("Value", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"

        if name == "throughput":
            metric = "Requests/sec"
            value = f"{result.get('requests_per_second', 'N/A')}"
        elif name == "latency_distribution":
            metric = "Prompt lengths"
            value = str(result.get("prompt_lengths_tested", "N/A"))
        elif name == "concurrent_requests":
            metric = "Successful"
            value = f"{result.get('successful', 0)}/{result.get('concurrency', 0)}"
        elif name == "long_context":
            metric = "Context lengths"
            value = str(result.get("context_lengths_tested", "N/A"))
        elif name == "tokens_per_second":
            metric = "Tokens/sec"
            value = f"{result.get('avg_tokens_per_sec', 'N/A')}"
        else:
            metric = "Detail"
            value = str(result.get("detail", "N/A"))[:30]

        table.add_row(name, status, metric, str(value))

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} benchmarks completed[/bold]")
