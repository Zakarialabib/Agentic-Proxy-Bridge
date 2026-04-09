import pytest

import httpx
import json
import asyncio

@pytest.mark.asyncio
async def test_chat():
    url = "http://localhost:3001/v1/chat/completions"
    payload = {
        "model": "qwen3.5-4b", # Assuming this is loaded
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello, how are you?"}
        ],
        "stream": True
    }
    
    print(f"Testing {url}...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    print(f"Error: {response.status_code}")
                    print(await response.aread())
                    return
                
                async for chunk in response.aiter_text():
                    print(f"Chunk: {repr(chunk)}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_chat())
