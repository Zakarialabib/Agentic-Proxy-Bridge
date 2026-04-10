from app.adapters.base import BackendAdapter
from app.adapters.lmstudio import LMStudioAdapter
from app.adapters.vllm import VLLMAdapter
from app.core.settings import settings

def get_active_adapter() -> BackendAdapter:
    if settings.ACTIVE_BACKEND == "vllm":
        return VLLMAdapter(base_url=settings.backend_base_url)
    return LMStudioAdapter(base_url=settings.backend_base_url)

__all__ = ["BackendAdapter", "LMStudioAdapter", "VLLMAdapter", "get_active_adapter"]
