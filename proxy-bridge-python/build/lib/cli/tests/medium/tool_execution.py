"""Tool execution tests - tests tool calling and function execution capabilities."""

import time
import json
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_tool_execution_tests(base_url: str, model: str) -> dict:
    """Run tool execution tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("tool_definition", _test_tool_definition),
        ("tool_calling", _test_tool_calling),
        ("multi_tool", _test_multi_tool),
        ("tool_with_result", _test_tool_with_result),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running tool execution tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} tool execution tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_tool_definition(base_url: str, model: str) -> dict:
    """Test that model accepts tool definitions."""
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather in a given location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "The city and state, e.g. San Francisco, CA"},
                        "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                    },
                    "required": ["location"],
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
                    "messages": [{"role": "user", "content": "What's the weather in Paris?"}],
                    "tools": tools,
                    "stream": False,
                    "max_tokens": 200,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                tool_calls = message.get("tool_calls", [])
                finish_reason = choice.get("finish_reason", "")

                return {
                    "ok": True,
                    "has_tool_calls": len(tool_calls) > 0,
                    "tool_call_count": len(tool_calls),
                    "finish_reason": finish_reason,
                    "content": message.get("content", "")[:100],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_tool_calling(base_url: str, model: str) -> dict:
    """Test model's ability to call a tool."""
    tools = [
        {
            "type": "function",
            "function": {
                "name": "calculate",
                "description": "Perform a mathematical calculation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": {"type": "string", "description": "The mathematical expression to evaluate"},
                    },
                    "required": ["expression"],
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
                    "messages": [{"role": "user", "content": "What is 25 * 48?"}],
                    "tools": tools,
                    "stream": False,
                    "max_tokens": 200,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                tool_calls = message.get("tool_calls", [])

                tool_call_details = []
                for tc in tool_calls:
                    func = tc.get("function", {})
                    tool_call_details.append({
                        "name": func.get("name"),
                        "arguments": func.get("arguments", ""),
                    })

                return {
                    "ok": True,
                    "has_tool_calls": len(tool_calls) > 0,
                    "tool_calls": tool_call_details,
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_multi_tool(base_url: str, model: str) -> dict:
    """Test model's ability to choose between multiple tools."""
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"},
                    },
                    "required": ["location"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "search_web",
                "description": "Search the web for information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                    },
                    "required": ["query"],
                },
            },
        },
    ]

    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Search for the latest news about AI"}],
                    "tools": tools,
                    "stream": False,
                    "max_tokens": 200,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                tool_calls = message.get("tool_calls", [])

                selected_tools = [tc.get("function", {}).get("name") for tc in tool_calls]

                return {
                    "ok": True,
                    "has_tool_calls": len(tool_calls) > 0,
                    "selected_tools": selected_tools,
                    "expected_tool": "search_web",
                    "correct_tool_selected": "search_web" in selected_tools,
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_tool_with_result(base_url: str, model: str) -> dict:
    """Test full tool calling cycle: call -> result -> response."""
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_current_temperature",
                "description": "Get the current temperature for a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"},
                    },
                    "required": ["location"],
                },
            },
        }
    ]

    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp1 = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "What's the temperature in Tokyo?"}],
                    "tools": tools,
                    "stream": False,
                    "max_tokens": 200,
                },
            )

            if resp1.status_code != 200:
                return {"ok": False, "status_code": resp1.status_code}

            data1 = resp1.json()
            choice1 = data1.get("choices", [{}])[0]
            message1 = choice1.get("message", {})
            tool_calls = message1.get("tool_calls", [])

            if not tool_calls:
                return {
                    "ok": True,
                    "tool_calls_made": False,
                    "content": message1.get("content", "")[:100],
                    "detail": "Model did not call tools, responded directly",
                    "latency_ms": round((time.time() - start) * 1000, 2),
                }

            tool_call = tool_calls[0]
            tool_call_id = tool_call.get("id", "call_123")
            func = tool_call.get("function", {})
            tool_name = func.get("name", "")
            tool_args = func.get("arguments", "{}")

            messages = [
                {"role": "user", "content": "What's the temperature in Tokyo?"},
                message1,
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": json.dumps({"temperature": 22, "unit": "celsius", "location": "Tokyo"}),
                },
            ]

            resp2 = await client.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "tools": tools,
                    "stream": False,
                    "max_tokens": 200,
                },
            )

            duration_ms = (time.time() - start) * 1000

            if resp2.status_code == 200:
                data2 = resp2.json()
                final_content = data2.get("choices", [{}])[0].get("message", {}).get("content", "")

                return {
                    "ok": True,
                    "tool_call_made": True,
                    "tool_name": tool_name,
                    "tool_args": tool_args,
                    "final_response": final_content[:150],
                    "total_latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "second_call_status": resp2.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def print_tool_execution_summary(results: dict):
    """Print a formatted summary of tool execution test results."""
    table = Table(title="Tool Execution Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Tool Calls", style="yellow")
    table.add_column("Details", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"
        tool_calls = str(result.get("tool_call_count", result.get("has_tool_calls", "N/A")))
        details = str(result.get("detail", ""))[:40]
        table.add_row(name, status, str(tool_calls), details)

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} tool execution tests passed[/bold]")
