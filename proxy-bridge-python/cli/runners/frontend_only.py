"""Frontend only tests."""

import httpx
from rich.console import Console

console = Console()

FRONTEND_URL = "http://127.0.0.1:3000"


async def run_frontend_only(frontend_url: str = FRONTEND_URL) -> dict:
    """Run tests against the frontend only."""
    results = {}

    console.print("  Frontend accessibility...")
    results["accessibility"] = await _test_frontend_accessible(frontend_url)

    console.print("  API route passthrough...")
    results["api_routes"] = await _test_api_routes(frontend_url)

    return results


async def _test_frontend_accessible(frontend_url: str) -> dict:
    """Test that the frontend is accessible."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(frontend_url)
            return {
                "ok": resp.status_code == 200,
                "status_code": resp.status_code,
                "has_html": "html" in resp.text[:500].lower(),
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_api_routes(frontend_url: str) -> dict:
    """Test that frontend API routes work (if any)."""
    routes = [
        "/api/health",
        "/api/models",
    ]

    results = {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        for route in routes:
            try:
                resp = await client.get(f"{frontend_url}{route}")
                results[route] = {
                    "ok": resp.status_code < 500,
                    "status_code": resp.status_code,
                }
            except Exception as e:
                results[route] = {"ok": False, "error": str(e)}

    all_ok = all(r["ok"] for r in results.values())
    return {"ok": all_ok, "routes": results}
