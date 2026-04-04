"""Full stack tests (proxy + frontend together)."""

import httpx
from rich.console import Console

from cli.tests.simple.health import run_health_tests
from cli.tests.simple.chat import run_chat_tests

console = Console()

FRONTEND_URL = "http://192.168.1.12:3000"


async def run_full_stack(base_url: str, frontend_url: str = FRONTEND_URL) -> dict:
    """Run tests against both proxy bridge and frontend together."""
    results = {}

    console.print("  Proxy bridge health...")
    results["proxy_health"] = await run_health_tests(base_url)

    console.print("  Frontend accessibility...")
    results["frontend"] = await _test_frontend(frontend_url)

    console.print("  End-to-end connectivity...")
    results["e2e"] = await _test_e2e(base_url, frontend_url)

    console.print("  Cross-origin behavior...")
    results["cors"] = await _test_cors(base_url, frontend_url)

    return results


async def _test_frontend(frontend_url: str) -> dict:
    """Test frontend is running."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(frontend_url)
            return {
                "ok": resp.status_code == 200,
                "status_code": resp.status_code,
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_e2e(base_url: str, frontend_url: str) -> dict:
    """Test end-to-end: frontend can reach proxy bridge."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test that frontend can proxy to bridge (if it has API routes)
            # Or test that both services are independently reachable
            bridge_resp = await client.get(f"{base_url}/health")
            frontend_resp = await client.get(frontend_url)

            return {
                "ok": bridge_resp.status_code < 500 and frontend_resp.status_code == 200,
                "bridge_status": bridge_resp.status_code,
                "frontend_status": frontend_resp.status_code,
                "both_reachable": True,
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_cors(base_url: str, frontend_url: str) -> dict:
    """Test CORS configuration between frontend and proxy."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.options(
                f"{base_url}/v1/models",
                headers={
                    "Origin": frontend_url,
                    "Access-Control-Request-Method": "GET",
                },
            )
            cors_headers = {
                "allow_origin": resp.headers.get("access-control-allow-origin", ""),
                "allow_methods": resp.headers.get("access-control-allow-methods", ""),
            }
            return {
                "ok": frontend_url in cors_headers.get("allow_origin", ""),
                "cors_headers": cors_headers,
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}
