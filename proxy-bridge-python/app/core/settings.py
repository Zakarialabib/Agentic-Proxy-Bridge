from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/v1"
    PROJECT_NAME: str = "Proxy Bridge API"

    # Bridge Settings
    BRIDGE_HOST: str = "0.0.0.0"
    BRIDGE_PORT: int = 3001

    # Engine Settings
    ACTIVE_BACKEND: str = "lmstudio"
    VLLM_BASE_URL: str = "http://localhost:8000"
    VLLM_MODEL: str = ""

    # LM Studio Settings
    LMSTUDIO_BASE_URL: str = "http://localhost:1234"

    @property
    def backend_base_url(self) -> str:
        if self.ACTIVE_BACKEND == "vllm":
            return self.VLLM_BASE_URL.rstrip("/")
        return self.LMSTUDIO_BASE_URL.rstrip("/")

    @property
    def lm_studio_base_url(self) -> str:
        return self.LMSTUDIO_BASE_URL.rstrip("/")

    # Resource Settings
    VRAM_BUDGET_GB: float = 8.0
    MAX_CONTEXT_LENGTH: int = 8192

    # Model Settings
    EMBED_MODEL: str = "text-embedding-qwen3-embedding-4b"
    RERANK_MODEL: str = "qwen3-reranker-0.6b"
    CHAT_MODEL: str = "qwen3.5-4b-claude-4.6-opus-reasoning-distilled-v2"

    # Feature Flags
    ENABLE_PROBING: bool = False
    ENABLE_PREWARMING: bool = False
    ENABLE_FALLBACK_CHAINS: bool = False
    APPROVAL_MODE: str = "autonomous"

    # Logging Settings
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "proxy-bridge.log"

    # Database Settings
    DATABASE_URL: str = "sqlite+aiosqlite:///../dev.db"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
