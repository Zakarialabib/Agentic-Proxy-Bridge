import httpx
import asyncio
import json

BASE_URL = "http://localhost:3001"

async def test_endpoints():
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("Testing /status...")
        try:
            resp = await client.get(f"{BASE_URL}/status")
            print(f"Status: {resp.status_code}, Response: {resp.json()}")
        except Exception as e:
            print(f"FAILED: {e}")

        print("\nTesting /models/available...")
        try:
            resp = await client.get(f"{BASE_URL}/models/available")
            print(f"Status: {resp.status_code}")
            data = resp.json()
            print(f"Available models count: {len(data.get('models', []))}")
        except Exception as e:
            print(f"FAILED: {e}")

        print("\nTesting /models/loaded...")
        try:
            resp = await client.get(f"{BASE_URL}/models/loaded")
            print(f"Status: {resp.status_code}, Count: {resp.json().get('count')}")
        except Exception as e:
            print(f"FAILED: {e}")

        print("\nTesting /settings...")
        try:
            resp = await client.get(f"{BASE_URL}/settings")
            print(f"Status: {resp.status_code}, Current log_level: {resp.json().get('log_level')}")
            
            # Test POST settings
            print("Updating log_level to DEBUG...")
            resp = await client.post(f"{BASE_URL}/settings", json={"log_level": "DEBUG"})
            print(f"Status: {resp.status_code}, New log_level: {resp.json().get('log_level')}")
        except Exception as e:
            print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
