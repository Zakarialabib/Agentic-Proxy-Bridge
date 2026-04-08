"""Agentic workflow tests - tests agent-based multi-step workflows."""

import time
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_agentic_workflow_tests(base_url: str, model: str) -> dict:
    """Run agentic workflow tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("ace_agents", _test_ace_agents),
        ("ace_sessions", _test_ace_sessions),
        ("agent_tool_use", _test_agent_tool_use),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running agentic workflow tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} agentic tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_ace_agents(base_url: str, model: str) -> dict:
    """Test ACE agents endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/api/ace/agents")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                agents = data if isinstance(data, list) else data.get("agents", [])
                return {
                    "ok": True,
                    "agent_count": len(agents),
                    "agents": [a.get("name", a.get("id", str(a))) for a in agents[:5]] if agents else [],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_ace_sessions(base_url: str, model: str) -> dict:
    """Test ACE sessions endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/api/ace/sessions")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                sessions = data if isinstance(data, list) else data.get("sessions", [])
                return {
                    "ok": True,
                    "session_count": len(sessions),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_agent_tool_use(base_url: str, model: str) -> dict:
    """Test agent using tools in a workflow."""
    tools = [
        {
            "type": "function",
            "function": {
                "name": "search_knowledge_base",
                "description": "Search the knowledge base for information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query"},
                    },
                    "required": ["query"],
                },
            },
        }
    ]

    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a research assistant. Use tools to find information before answering."},
                        {"role": "user", "content": "What are the latest developments in quantum computing?"},
                    ],
                    "tools": tools,
                    "stream": False,
                    "max_tokens": 300,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                tool_calls = message.get("tool_calls", [])
                content = message.get("content", "")

                return {
                    "ok": True,
                    "used_tools": len(tool_calls) > 0,
                    "tool_call_count": len(tool_calls),
                    "content_length": len(content),
                    "content_preview": content[:100],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def print_agentic_workflow_summary(results: dict):
    """Print a formatted summary of agentic workflow test results."""
    table = Table(title="Agentic Workflow Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Metric", style="yellow")
    table.add_column("Value", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"

        if name == "ace_agents":
            metric = "Agents"
            value = str(result.get("agent_count", "N/A"))
        elif name == "ace_sessions":
            metric = "Sessions"
            value = str(result.get("session_count", "N/A"))
        elif name == "agent_tool_use":
            metric = "Tools Used"
            value = str(result.get("tool_call_count", 0))
        else:
            metric = "Detail"
            value = str(result.get("detail", "N/A"))[:30]

        table.add_row(name, status, metric, str(value))

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} agentic tests passed[/bold]")
