import httpx
from typing import Any, Dict, List, Optional
from app.core.settings import settings


class LMStudioAdapter:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.LMSTUDIO_BASE_URL).rstrip("/")
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

    async def list_models(self) -> List[Dict[str, Any]]:
        response = await self.client.get("/v1/models")
        response.raise_for_status()
        data = response.json()
        return data.get("data", [])

    async def get_loaded_models(self) -> List[Dict[str, Any]]:
        models = await self.list_models()
        return [m for m in models if m.get("state") == "loaded" or m.get("loaded_instances", 0) > 0]

    async def load_model(self, model_id: str) -> Dict[str, Any]:
        response = await self.client.post(
            "/v1/models/load",
            json={"model": model_id},
        )
        response.raise_for_status()
        return response.json()

    async def unload_model(self, model_id: str) -> Dict[str, Any]:
        response = await self.client.post(
            "/v1/models/unload",
            json={"model": model_id},
        )
        response.raise_for_status()
        return response.json()

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "",
        stream: bool = False,
        temperature: float = 0.7,
        max_tokens: int = -1,
        **kwargs: Any,
    ) -> Any:
        payload: Dict[str, Any] = {
            "model": model or settings.CHAT_MODEL,
            "messages": messages,
            "stream": stream,
            "temperature": temperature,
        }
        if max_tokens > 0:
            payload["max_tokens"] = max_tokens
        payload.update(kwargs)

        if stream:
            req = self.client.build_request(
                "POST",
                "/v1/chat/completions",
                json=payload,
            )
            response = await self.client.send(req, stream=True)
            response.raise_for_status()
            return response
        else:
            response = await self.client.post("/v1/chat/completions", json=payload)
            response.raise_for_status()
            return response.json()

    async def create_embedding(self, input: str | List[str], model: str = "") -> Dict[str, Any]:
        payload = {
            "model": model or settings.EMBED_MODEL,
            "input": input,
        }
        response = await self.client.post("/v1/embeddings", json=payload)
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "LMStudioAdapter":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
