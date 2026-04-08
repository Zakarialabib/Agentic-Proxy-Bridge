"""MCP integration tests - tests Model Context Protocol integration."""

import time
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_mcp_integration_tests(base_url: str, model: str) -> dict:
    """Run MCP integration tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("mcp_servers", _test_mcp_servers),
        ("mcp_tools", _test_mcp_tools),
        ("mcp_with_chat", _test_mcp_with_chat),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running MCP integration tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} MCP tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_mcp_servers(base_url: str, model: str) -> dict:
    """Test MCP servers endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/api/mcp/servers")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                servers = data if isinstance(data, list) else data.get("servers", [])
                return {
                    "ok": True,
                    "server_count": len(servers),
                    "servers": [s.get("name", s.get("url", str(s))) for s in servers[:5]] if servers else [],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_mcp_tools(base_url: str, model: str) -> dict:
    """Test MCP tools endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/api/mcp/tools")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                tools = data if isinstance(data, list) else data.get("tools", [])
                return {
                    "ok": True,
                    "tool_count": len(tools),
                    "tools": [t.get("name", str(t)) for t in tools[:5]] if tools else [],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_mcp_with_chat(base_url: str, model: str) -> dict:
    """Test chat with MCP tools available."""
    try:
        tools_resp = await httpx.AsyncClient(timeout=10.0).get(f"{base_url}/api/mcp/tools")
        mcp_tools = []
        if tools_resp.status_code == 200:
            data = tools_resp.json()
            tools_list = data if isinstance(data, list) else data.get("tools", [])
            mcp_tools = [{"type": "function", "function": t} if "parameters" in t else t for t in tools_list[:3]]

        start = time.time()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are an assistant with access to external tools."},
                        {"role": "user", "content": "Can you help me with something?"},
                    ],
                    "tools": mcp_tools if mcp_tools else None,
                    "stream": False,
                    "max_tokens": 200,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                tool_calls = data.get("choices", [{}])[0].get("message", {}).get("tool_calls", [])

                return {
                    "ok": True,
                    "mcp_tools_available": len(mcp_tools),
                    "used_tools": len(tool_calls) > 0,
                    "content_length": len(content),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def print_mcp_integration_summary(results: dict):
    """Print a formatted summary of MCP integration test results."""
    table = Table(title="MCP Integration Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Metric", style="yellow")
    table.add_column("Value", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"

        if name == "mcp_servers":
            metric = "Servers"
            value = str(result.get("server_count", "N/A"))
        elif name == "mcp_tools":
            metric = "Tools"
            value = str(result.get("tool_count", "N/A"))
        elif name == "mcp_with_chat":
            metric = "MCP Tools"
            value = f"{result.get('mcp_tools_available', 0)} available"
        else:
            metric = "Detail"
            value = str(result.get("detail", "N/A"))[:30]

        table.add_row(name, status, metric, str(value))

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} MCP tests passed[/bold]")
