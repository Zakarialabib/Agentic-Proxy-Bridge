import httpx
from typing import Dict
import os
from prometheus_client import Gauge
from contextlib import asynccontextmanager

# Optional: Add prometheus metrics for connection pool
ACTIVE_CONNECTIONS = Gauge('active_connections', 'Number of active HTTP connections to upstream')

class ConnectionPool:
    def __init__(self):
        # We can implement a hierarchical pool (e.g. per-provider or per-model limits)
        # For simplicity, we use one large pool for default, and potentially specific ones.
        self._clients: Dict[str, httpx.AsyncClient] = {}
        
    def get_client(self, provider: str = "default") -> httpx.AsyncClient:
        if provider not in self._clients:
            # Configure limits for the pool
            limits = httpx.Limits(max_keepalive_connections=100, max_connections=200)
            timeout = httpx.Timeout(60.0)
            client = httpx.AsyncClient(limits=limits, timeout=timeout)
            self._clients[provider] = client
        return self._clients[provider]
        
    @asynccontextmanager
    async def track_connection(self):
        ACTIVE_CONNECTIONS.inc()
        try:
            yield
        finally:
            ACTIVE_CONNECTIONS.dec()
        
    async def close_all(self):
        for client in self._clients.values():
            await client.aclose()
        self._clients.clear()

# Global connection pool instance
connection_pool = ConnectionPool()
