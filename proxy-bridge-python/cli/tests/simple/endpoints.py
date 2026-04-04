"""Comprehensive endpoint tests - tests each API endpoint individually."""

import time
import json
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_endpoint_tests(base_url: str) -> dict:
    """Run all endpoint tests individually."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    endpoints = [
        ("health", _test_health),
        ("status", _test_status),
        ("models_list", _test_models_list),
        ("hardware_profile", _test_hardware_profile),
        ("hardware_memory", _test_hardware_memory),
        ("hardware_cpu", _test_hardware_cpu),
        ("observability_health", _test_observability_health),
        ("observability_alerts", _test_observability_alerts),
        ("presets_list", _test_presets_list),
        ("presets_create", _test_presets_create),
        ("mcp_servers", _test_mcp_servers),
        ("mcp_tools", _test_mcp_tools),
        ("ace_agents", _test_ace_agents),
        ("ace_sessions", _test_ace_sessions),
        ("retrieve_query", _test_retrieve_query),
        ("retrieve_stats", _test_retrieve_stats),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Testing endpoints...", total=len(endpoints))

        for name, test_func in endpoints:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} endpoints responding"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_health(base_url: str) -> dict:
    """Test GET /health endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/health")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "status": data.get("status"),
                    "bridge": data.get("bridge"),
                    "lmstudio": data.get("lmstudio"),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_status(base_url: str) -> dict:
    """Test GET /api/status endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/status")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "status": data.get("status"),
                    "lmstudio_connected": data.get("lmstudio_connected"),
                    "uptime_seconds": data.get("uptime_seconds"),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_models_list(base_url: str) -> dict:
    """Test GET /v1/models endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/v1/models")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                models = data.get("data", [])
                model_ids = [m.get("id", str(m)) for m in models] if isinstance(models, list) else []
                return {
                    "ok": True,
                    "model_count": len(model_ids),
                    "models": model_ids[:5],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_hardware_profile(base_url: str) -> dict:
    """Test GET /api/hardware/profile endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/hardware/profile")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "platform": data.get("platform"),
                    "gpu_name": data.get("gpu_name"),
                    "gpu_vram_gb": data.get("gpu_vram_gb"),
                    "system_ram_gb": data.get("system_ram_gb"),
                    "cpu_cores": data.get("cpu_cores"),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_hardware_memory(base_url: str) -> dict:
    """Test GET /api/hardware/memory endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/hardware/memory")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "total_gb": data.get("total_gb"),
                    "available_gb": data.get("available_gb"),
                    "used_gb": data.get("used_gb"),
                    "percent": data.get("percent"),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_hardware_cpu(base_url: str) -> dict:
    """Test GET /api/hardware/cpu endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/hardware/cpu")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "cores": data.get("cores"),
                    "logical_cores": data.get("logical_cores"),
                    "frequency_mhz": data.get("frequency_mhz"),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_observability_health(base_url: str) -> dict:
    """Test GET /api/observability/health endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/observability/health")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "health": data.get("health"),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_observability_alerts(base_url: str) -> dict:
    """Test GET /api/observability/alerts endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/observability/alerts")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                alerts = data if isinstance(data, list) else data.get("alerts", [])
                return {
                    "ok": True,
                    "alert_count": len(alerts),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_presets_list(base_url: str) -> dict:
    """Test GET /api/presets endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/presets")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                presets = data if isinstance(data, list) else data.get("presets", [])
                return {
                    "ok": True,
                    "preset_count": len(presets),
                    "presets": [p.get("name", p) for p in presets[:5]],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_presets_create(base_url: str) -> dict:
    """Test POST /api/presets endpoint."""
    start = time.time()
    try:
        test_preset = {
            "name": f"test-preset-{int(time.time())}",
            "description": "Auto-generated test preset",
            "config": {
                "temperature": 0.7,
                "max_tokens": 1024,
                "top_p": 0.9,
            },
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{base_url}/api/presets",
                json=test_preset,
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code in (200, 201):
                data = resp.json()
                return {
                    "ok": True,
                    "preset_id": data.get("id", data.get("name")),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_mcp_servers(base_url: str) -> dict:
    """Test GET /api/mcp/servers endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/mcp/servers")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                servers = data if isinstance(data, list) else data.get("servers", [])
                return {
                    "ok": True,
                    "server_count": len(servers),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_mcp_tools(base_url: str) -> dict:
    """Test GET /api/mcp/tools endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/mcp/tools")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                tools = data if isinstance(data, list) else data.get("tools", [])
                return {
                    "ok": True,
                    "tool_count": len(tools),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_ace_agents(base_url: str) -> dict:
    """Test GET /api/ace/agents endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/ace/agents")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                agents = data if isinstance(data, list) else data.get("agents", [])
                return {
                    "ok": True,
                    "agent_count": len(agents),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_ace_sessions(base_url: str) -> dict:
    """Test GET /api/ace/sessions endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
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


async def _test_retrieve_query(base_url: str) -> dict:
    """Test POST /api/retrieve/query endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{base_url}/api/retrieve/query",
                json={"query": "test query", "top_k": 3},
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "result_count": len(data.get("results", [])),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_retrieve_stats(base_url: str) -> dict:
    """Test GET /api/retrieve/stats endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
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


def print_endpoint_summary(results: dict):
    """Print a formatted summary of endpoint test results."""
    table = Table(title="Endpoint Test Summary")
    table.add_column("Endpoint", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Latency (ms)", style="yellow")
    table.add_column("Details", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"
        latency = f"{result.get('latency_ms', 'N/A')}"
        details = str(result.get("detail", ""))[:40]
        table.add_row(name, status, str(latency), details)

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} endpoints responding[/bold]")
