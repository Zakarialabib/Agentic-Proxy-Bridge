from app.adapters.base import BackendAdapter
from app.core.settings import settings
import time
from typing import Any, Dict, List, Optional

class VLLMAdapter(BackendAdapter):
    def __init__(self, base_url: Optional[str] = None):
        super().__init__(base_url or settings.VLLM_BASE_URL)

    async def list_models(self) -> List[Dict[str, Any]]:
        response = await self.client.get("/v1/models")
        response.raise_for_status()
        data = response.json()
        raw_models = data.get("data", [])
        
        normalized = []
        for m in raw_models:
            normalized.append({
                "id": m.get("id") or m.get("root") or "unknown",
                "object": "model",
                "created": m.get("created") or int(time.time()),
                "owned_by": "vllm",
                "state": "loaded",
                "loaded_instances": 1
            })
        return normalized

    async def get_loaded_models(self) -> List[Dict[str, Any]]:
        return await self.list_models()

    async def load_model(self, model_id: str, **kwargs) -> Dict[str, Any]:
        # vLLM manages models at startup. Mocking success for proxy compatibility.
        return {"status": "success", "message": f"vLLM is already serving {model_id}"}

    async def unload_model(self, model_id: str) -> Dict[str, Any]:
        return {"status": "success", "message": f"vLLM ignores unload requests"}

    async def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "", 
        stream: bool = False, 
        temperature: float = 0.7, 
        max_tokens: int = -1, 
        **kwargs: Any
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
            req = self.client.build_request("POST", "/v1/chat/completions", json=payload)
            response = await self.client.send(req, stream=True)
            response.raise_for_status()
            return response
        else:
            response = await self.client.post("/v1/chat/completions", json=payload)
            response.raise_for_status()
            return response.json()

    async def create_embedding(self, input: str | List[str], model: str = "") -> Dict[str, Any]:
        payload = {"model": model or settings.EMBED_MODEL, "input": input}
        response = await self.client.post("/v1/embeddings", json=payload)
        response.raise_for_status()
        return response.json()
