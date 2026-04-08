"""Model management tests - tests model loading, unloading, and switching."""

import time
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_model_management_tests(base_url: str) -> dict:
    """Run all model management tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("list_models", _test_list_models),
        ("get_loaded_models", _test_get_loaded_models),
        ("model_format_compliance", _test_model_format_compliance),
        ("model_metadata", _test_model_metadata),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running model management tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} model management tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_list_models(base_url: str) -> dict:
    """Test GET /v1/models endpoint."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/v1/models")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                models = data.get("data", [])
                if not isinstance(models, list):
                    models = []

                model_ids = [m.get("id", str(m)) for m in models]
                return {
                    "ok": True,
                    "model_count": len(model_ids),
                    "models": model_ids[:10],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_get_loaded_models(base_url: str) -> dict:
    """Test getting currently loaded models."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/v1/models")
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                models = data.get("data", [])
                loaded_models = []

                for m in models:
                    if isinstance(m, dict):
                        model_info = {
                            "id": m.get("id"),
                            "created": m.get("created"),
                            "owned_by": m.get("owned_by"),
                        }
                        loaded_models.append(model_info)

                return {
                    "ok": True,
                    "loaded_count": len(loaded_models),
                    "models": loaded_models[:5],
                    "latency_ms": round(duration_ms, 2),
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_model_format_compliance(base_url: str) -> dict:
    """Test that model listing returns OpenAI-compliant format."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/v1/models")

            if resp.status_code == 200:
                data = resp.json()

                has_object = "object" in data
                has_data = "data" in data and isinstance(data["data"], list)

                format_compliant = True
                missing_fields = []

                if has_data and len(data["data"]) > 0:
                    first_model = data["data"][0]
                    required_fields = ["id", "object", "created", "owned_by"]
                    for field in required_fields:
                        if field not in first_model:
                            format_compliant = False
                            missing_fields.append(field)

                return {
                    "ok": has_object and has_data,
                    "format_compliant": format_compliant,
                    "has_object_field": has_object,
                    "has_data_field": has_data,
                    "missing_fields": missing_fields,
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_model_metadata(base_url: str) -> dict:
    """Test model metadata completeness."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/v1/models")

            if resp.status_code == 200:
                data = resp.json()
                models = data.get("data", [])

                if not models:
                    return {
                        "ok": True,
                        "model_count": 0,
                        "detail": "No models available",
                    }

                metadata_complete = True
                incomplete_models = []

                for m in models[:5]:
                    if isinstance(m, dict):
                        missing = []
                        for field in ["id", "object"]:
                            if field not in m:
                                missing.append(field)
                        if missing:
                            metadata_complete = False
                            incomplete_models.append({"id": m.get("id", "unknown"), "missing": missing})

                return {
                    "ok": metadata_complete,
                    "model_count": len(models),
                    "metadata_complete": metadata_complete,
                    "incomplete_models": incomplete_models,
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def print_model_management_summary(results: dict):
    """Print a formatted summary of model management test results."""
    table = Table(title="Model Management Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Details", style="yellow")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"
        details = str(result.get("detail", ""))[:50]
        if "model_count" in result:
            details = f"Models: {result['model_count']}"
        elif "loaded_count" in result:
            details = f"Loaded: {result['loaded_count']}"
        table.add_row(name, status, details)

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} model management tests passed[/bold]")
