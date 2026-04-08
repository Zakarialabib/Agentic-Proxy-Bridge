"""Proxy bridge only tests."""

import httpx
from rich.console import Console

from cli.tests.simple.health import run_health_tests
from cli.tests.simple.openai_compat import run_openai_compat_tests

console = Console()


async def run_proxy_only(base_url: str) -> dict:
    """Run all tests against the proxy bridge only."""
    results = {}

    console.print("  Health & connectivity...")
    results["health"] = await run_health_tests(base_url)

    console.print("  OpenAI compatibility...")
    results["openai_compat"] = await run_openai_compat_tests(base_url)

    console.print("  API endpoints coverage...")
    results["endpoints"] = await _test_all_endpoints(base_url)

    console.print("  Error resilience...")
    results["error_handling"] = await _test_error_resilience(base_url)

    return results


async def _test_all_endpoints(base_url: str) -> dict:
    """Test all known proxy bridge endpoints."""
    endpoints = [
        ("GET", "/health"),
        ("GET", "/status"),
        ("GET", "/api/status"),
        ("GET", "/v1/models"),
        ("POST", "/v1/chat/completions"),
    ]

    results = {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        for method, path in endpoints:
            try:
                if method == "GET":
                    resp = await client.get(f"{base_url}{path}")
                else:
                    resp = await client.post(
                        f"{base_url}{path}",
                        json={"model": "test", "messages": [], "stream": False},
                    )
                results[path] = {
                    "ok": resp.status_code < 500,
                    "status_code": resp.status_code,
                }
            except Exception as e:
                results[path] = {"ok": False, "error": str(e)}

    all_ok = all(r["ok"] for r in results.values())
    return {"ok": all_ok, "endpoints": results, "detail": f"{sum(1 for r in results.values() if r['ok'])}/{len(results)} reachable"}


async def _test_error_resilience(base_url: str) -> dict:
    """Test proxy bridge error handling."""
    tests = {}

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Empty body
        try:
            resp = await client.post(f"{base_url}/v1/chat/completions", content=b"")
            tests["empty_body"] = {"ok": resp.status_code >= 400, "status": resp.status_code}
        except Exception as e:
            tests["empty_body"] = {"ok": False, "error": str(e)}

        # Invalid JSON
        try:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                content=b"not json",
                headers={"Content-Type": "application/json"},
            )
            tests["invalid_json"] = {"ok": resp.status_code >= 400, "status": resp.status_code}
        except Exception as e:
            tests["invalid_json"] = {"ok": False, "error": str(e)}

        # Missing model
        try:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json={"messages": [{"role": "user", "content": "Hi"}], "stream": False},
            )
            tests["missing_model"] = {"ok": resp.status_code >= 400, "status": resp.status_code}
        except Exception as e:
            tests["missing_model"] = {"ok": False, "error": str(e)}

    all_ok = all(t["ok"] for t in tests.values())
    return {"ok": all_ok, "tests": tests}
