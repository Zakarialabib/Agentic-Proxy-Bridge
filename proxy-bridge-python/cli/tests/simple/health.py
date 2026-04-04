"""Health and connectivity tests."""

import time

import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

console = Console()


async def run_health_tests(base_url: str) -> dict:
    """Run all health and connectivity tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
    }

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running health tests...", total=4)

        progress.update(task, description="Testing /health endpoint...")
        health = await _test_health(base_url)
        results["tests"]["health"] = health
        progress.advance(task)

        progress.update(task, description="Testing /api/status...")
        status = await _test_system_status(base_url)
        results["tests"]["system_status"] = status
        progress.advance(task)

        progress.update(task, description="Testing /v1/models...")
        models = await _test_models(base_url)
        results["tests"]["models"] = models
        progress.advance(task)

        progress.update(task, description="Testing hardware detection...")
        hardware = await _test_hardware(base_url)
        results["tests"]["hardware"] = hardware
        progress.advance(task)

    all_ok = all(t.get("ok", False) for t in results["tests"].values())
    results["ok"] = all_ok
    results["detail"] = f"Health={health.get('status', '?')}, Models={models.get('count', 0)}, GPU={hardware.get('gpu_name', '?')}"

    return results


async def _test_health(base_url: str) -> dict:
    """Test /health endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/health")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                lm_status = data.get("lmstudio", "unknown")
                return {
                    "ok": True,
                    "status": data.get("status", "unknown"),
                    "lmstudio": lm_status,
                    "bridge": data.get("bridge", "unknown"),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_system_status(base_url: str) -> dict:
    """Test /api/status endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/status")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "status": data.get("status", "unknown"),
                    "lmstudio_connected": data.get("lmstudio_connected", False),
                    "uptime_seconds": data.get("uptime_seconds", 0),
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_models(base_url: str) -> dict:
    """Test /v1/models endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/v1/models")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                models_data = data.get("data", data) if isinstance(data, dict) else data
                model_ids = [m.get("id", m) if isinstance(m, dict) else str(m) for m in models_data]
                return {
                    "ok": True,
                    "count": len(model_ids),
                    "models": model_ids[:10],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_hardware(base_url: str) -> dict:
    """Test hardware detection via /api/status."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/status")

            if resp.status_code == 200:
                data = resp.json()
                hw = data.get("hardware", {})
                return {
                    "ok": True,
                    "gpu_name": hw.get("gpu_name", "Unknown"),
                    "gpu_vram_gb": hw.get("gpu_vram_gb", 0),
                    "system_ram_gb": hw.get("system_ram_gb", 0),
                    "cpu_cores": hw.get("cpu_cores", 0),
                    "platform": hw.get("platform", "Unknown"),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}
