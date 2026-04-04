"""Scenario-based testing - tests model performance across different use cases."""

import time
import json
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()

SCENARIOS = {
    "code_assistant": {
        "system": "You are an expert coding assistant. Provide clear, concise code solutions with brief explanations.",
        "prompt": "Write a Python function that implements binary search on a sorted array. Include type hints and docstring.",
        "expected_keywords": ["def", "binary", "search", "return"],
    },
    "creative_writer": {
        "system": "You are a creative writer. Write engaging, imaginative content.",
        "prompt": "Write a short 3-sentence story about a robot discovering emotions.",
        "expected_keywords": [],
    },
    "data_analyst": {
        "system": "You are a data analyst. Provide analytical insights and structured responses.",
        "prompt": "Given a dataset with columns: age, income, education_level - what are 3 key analyses you would perform?",
        "expected_keywords": ["analysis", "data", "correlation"],
    },
    "math_solver": {
        "system": "You are a math tutor. Show step-by-step solutions.",
        "prompt": "Solve the equation: 2x^2 + 5x - 3 = 0. Show all steps.",
        "expected_keywords": ["x", "solution", "step"],
    },
    "summarizer": {
        "system": "You are a summarization expert. Provide concise summaries.",
        "prompt": "Summarize the following in 2 sentences: The Internet of Things (IoT) refers to the interconnected network of physical devices embedded with electronics, software, sensors, and network connectivity, which enables these objects to collect and exchange data.",
        "expected_keywords": ["IoT", "devices", "data"],
    },
    "translator": {
        "system": "You are a professional translator. Provide accurate translations.",
        "prompt": "Translate to French: 'Hello, how are you today?'",
        "expected_keywords": ["Bonjour", "comment"],
    },
}


async def run_scenario_tests(base_url: str, model: str, scenarios: list[str] | None = None) -> dict:
    """Run scenario-based tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    test_scenarios = {k: v for k, v in SCENARIOS.items() if scenarios is None or k in scenarios}

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running scenario tests...", total=len(test_scenarios))

        for name, scenario in test_scenarios.items():
            progress.update(task, description=f"Testing {name}...")
            result = await _test_scenario(base_url, model, name, scenario)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} scenarios passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_scenario(base_url: str, model: str, name: str, scenario: dict) -> dict:
    """Test a specific scenario."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": scenario["system"]},
                        {"role": "user", "content": scenario["prompt"]},
                    ],
                    "stream": False,
                    "temperature": 0.7,
                    "max_tokens": 500,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                usage = data.get("usage", {})

                content_lower = content.lower()
                keywords_found = sum(1 for kw in scenario.get("expected_keywords", []) if kw.lower() in content_lower)
                keywords_total = len(scenario.get("expected_keywords", []))
                keyword_score = keywords_found / keywords_total if keywords_total > 0 else 1.0

                return {
                    "ok": True,
                    "content_length": len(content),
                    "content_preview": content[:100],
                    "latency_ms": round(duration_ms, 2),
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                    "keywords_found": keywords_found,
                    "keywords_total": keywords_total,
                    "keyword_score": round(keyword_score, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def print_scenario_summary(results: dict):
    """Print a formatted summary of scenario test results."""
    table = Table(title="Scenario Test Summary")
    table.add_column("Scenario", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Tokens", style="yellow")
    table.add_column("Latency (ms)", style="magenta")
    table.add_column("Keywords", style="blue")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"
        tokens = str(result.get("total_tokens", "N/A"))
        latency = f"{result.get('latency_ms', 'N/A')}"
        keywords = f"{result.get('keywords_found', 0)}/{result.get('keywords_total', 0)}"
        table.add_row(name, status, tokens, str(latency), keywords)

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} scenarios passed[/bold]")
