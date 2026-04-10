import asyncio
from httpx import AsyncClient
from proxy_bridge_python.app.main import app

async def test():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r1 = await ac.get("/health")
        print("GET /health:", r1.json())
        
        r2 = await ac.get("/status")
        print("GET /status:", r2.json())
        
        r3 = await ac.get("/api/status")
        print("GET /api/status:", r3.json())

asyncio.run(test())
