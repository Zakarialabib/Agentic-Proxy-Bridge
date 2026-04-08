import json
import httpx
import logging
from typing import AsyncGenerator

from app.services.pool import connection_pool

logger = logging.getLogger(__name__)

async def stream_generator(
    response: httpx.Response,
) -> AsyncGenerator[bytes, None]:
    """
    Backpressure-aware streaming generator.
    Yields chunks of bytes from the httpx response asynchronously.
    """
    try:
        # aiter_bytes provides backpressure-aware reading from the socket
        async for chunk in response.aiter_bytes():
            yield chunk
    except Exception as e:
        logger.error(f"Error during streaming: {e}")
        # In a real implementation, you might want to yield an error chunk or raise
        yield b'{"error": "Streaming failed"}'
    finally:
        await response.aclose()
        from app.services.pool import ACTIVE_CONNECTIONS
        ACTIVE_CONNECTIONS.dec()
