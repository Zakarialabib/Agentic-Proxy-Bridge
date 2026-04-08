import asyncio
import hashlib
from typing import List, Dict, Any
from app.services.pool import connection_pool
from prometheus_client import Gauge, Histogram
import os

EMBEDDING_BATCH_SIZE = Gauge('embedding_batch_size', 'Current size of embedding batch')
EMBEDDING_LATENCY = Histogram('embedding_latency_seconds', 'Latency of embedding upstream requests')

from app.core.settings import settings

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "mock_key")

class EmbeddingCoalescer:
    def __init__(self, max_batch_size: int = 100, wait_time_ms: int = 50):
        self.max_batch_size = max_batch_size
        self.wait_time_ms = wait_time_ms
        self.current_batch: List[str] = []
        # Maps text hash to a list of Futures awaiting the embedding vector
        self.waiters: Dict[str, List[asyncio.Future]] = {}
        self._timer_task = None

    def _hash_text(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    async def get_embedding(self, text: str, model: str) -> List[float]:
        text_hash = self._hash_text(text)
        
        loop = asyncio.get_running_loop()
        future = loop.create_future()

        if text_hash in self.waiters:
            self.waiters[text_hash].append(future)
        else:
            self.waiters[text_hash] = [future]
            self.current_batch.append(text)

        EMBEDDING_BATCH_SIZE.set(len(self.current_batch))

        if len(self.current_batch) >= self.max_batch_size:
            self._flush(model)
        elif not self._timer_task:
            self._timer_task = asyncio.create_task(self._wait_and_flush(model))

        return await future

    async def _wait_and_flush(self, model: str):
        await asyncio.sleep(self.wait_time_ms / 1000.0)
        self._timer_task = None
        if self.current_batch:
            self._flush(model)

    def _flush(self, model: str):
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
        self._timer_task = None

        batch_to_process = self.current_batch[:]
        waiters_to_resolve = {
            self._hash_text(text): self.waiters.pop(self._hash_text(text))
            for text in batch_to_process
        }
        self.current_batch.clear()
        EMBEDDING_BATCH_SIZE.set(0)

        asyncio.create_task(self._dispatch_batch(batch_to_process, model, waiters_to_resolve))

    @EMBEDDING_LATENCY.time()
    async def _dispatch_batch(self, batch: List[str], model: str, waiters: Dict[str, List[asyncio.Future]]):
        client = connection_pool.get_client("openai")
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "input": batch
        }

        try:
            async with connection_pool.track_connection():
                response = await client.post(
                    f"{settings.lm_studio_base_url}/v1/embeddings",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
            
            # Map results back to futures
            embeddings = {item['index']: item['embedding'] for item in data['data']}
            for i, text in enumerate(batch):
                text_hash = self._hash_text(text)
                emb = embeddings.get(i)
                for future in waiters[text_hash]:
                    if not future.done():
                        if emb is not None:
                            future.set_result(emb)
                        else:
                            future.set_exception(Exception("Embedding not found in response"))
        except Exception as e:
            # Propagate error to all waiters
            for text in batch:
                text_hash = self._hash_text(text)
                for future in waiters[text_hash]:
                    if not future.done():
                        future.set_exception(e)

# Global coalescer instance
embedding_coalescer = EmbeddingCoalescer()
