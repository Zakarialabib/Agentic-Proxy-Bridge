"""RAG pipeline tests - tests retrieval-augmented generation workflow."""

import time
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_rag_pipeline_tests(base_url: str, model: str) -> dict:
    """Run RAG pipeline tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("retrieve_query", _test_retrieve_query),
        ("retrieve_stats", _test_retrieve_stats),
        ("rag_with_context", _test_rag_with_context),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running RAG pipeline tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} RAG tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_retrieve_query(base_url: str, model: str) -> dict:
    """Test retrieval query endpoint."""
    queries = ["What is machine learning?", "How does neural network work?"]
    results = {}

    for query in queries:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/api/retrieve/query",
                    json={"query": query, "top_k": 3},
                )
                duration_ms = (time.time() - start) * 1000

                if resp.status_code == 200:
                    data = resp.json()
                    retrieved = data.get("results", [])
                    results[query[:30]] = {
                        "ok": True,
                        "results_count": len(retrieved),
                        "latency_ms": round(duration_ms, 2),
                    }
                else:
                    results[query[:30]] = {"ok": False, "status_code": resp.status_code}
        except Exception as e:
            results[query[:30]] = {"ok": False, "error": str(e)}

    all_ok = all(r.get("ok") for r in results.values())
    return {
        "ok": all_ok,
        "queries_tested": len(queries),
        "results": results,
    }


async def _test_retrieve_stats(base_url: str, model: str) -> dict:
    """Test retrieval stats endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/api/retrieve/stats")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "stats": data,
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_rag_with_context(base_url: str, model: str) -> dict:
    """Test RAG workflow: retrieve -> augment -> generate."""
    query = "What are the benefits of exercise?"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            retrieve_resp = await client.post(
                f"{base_url}/api/retrieve/query",
                json={"query": query, "top_k": 3},
            )

            context = ""
            retrieved_count = 0
            if retrieve_resp.status_code == 200:
                data = retrieve_resp.json()
                retrieved = data.get("results", [])
                retrieved_count = len(retrieved)
                context = "\n".join(r.get("content", "") for r in retrieved if isinstance(r, dict))

            messages = [{"role": "user", "content": query}]
            if context:
                messages.insert(0, {"role": "system", "content": f"Use this context to answer: {context}"})

            chat_resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "max_tokens": 300,
                },
            )

            if chat_resp.status_code == 200:
                data = chat_resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {
                    "ok": True,
                    "retrieved_count": retrieved_count,
                    "context_used": bool(context),
                    "response_length": len(content),
                    "response_preview": content[:100],
                }
            return {"ok": False, "status_code": chat_resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def print_rag_pipeline_summary(results: dict):
    """Print a formatted summary of RAG pipeline test results."""
    table = Table(title="RAG Pipeline Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Metric", style="yellow")
    table.add_column("Value", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"

        if name == "retrieve_query":
            metric = "Queries"
            value = str(result.get("queries_tested", "N/A"))
        elif name == "retrieve_stats":
            metric = "Stats"
            value = "Available" if result.get("stats") else "N/A"
        elif name == "rag_with_context":
            metric = "Context"
            value = f"Retrieved: {result.get('retrieved_count', 0)}"
        else:
            metric = "Detail"
            value = str(result.get("detail", "N/A"))[:30]

        table.add_row(name, status, metric, str(value))

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} RAG tests passed[/bold]")
