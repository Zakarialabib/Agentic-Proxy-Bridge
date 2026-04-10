import httpx
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

class BackendAdapter(ABC):
    def __init__(self, base_url: str):
        self.base_url = base_url
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(120.0, connect=10.0),
                headers={"Content-Type": "application/json"},
            )
        return self._client

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]: pass

    @abstractmethod
    async def get_loaded_models(self) -> List[Dict[str, Any]]: pass

    @abstractmethod
    async def load_model(self, model_id: str, **kwargs) -> Dict[str, Any]: pass

    @abstractmethod
    async def unload_model(self, model_id: str) -> Dict[str, Any]: pass

    @abstractmethod
    async def chat_completion(self, messages: List[Dict[str, str]], **kwargs: Any) -> Any: pass

    @abstractmethod
    async def create_embedding(self, input: str | List[str], model: str = "") -> Dict[str, Any]: pass

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
