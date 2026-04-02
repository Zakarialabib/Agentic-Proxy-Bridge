from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/v1"
    PROJECT_NAME: str = "Proxy Bridge API"
    
    # LM Studio Settings
    LM_STUDIO_HOST: str = "localhost"
    LM_STUDIO_PORT: int = 1234
    
    @property
    def lm_studio_base_url(self) -> str:
        return f"http://{self.LM_STUDIO_HOST}:{self.LM_STUDIO_PORT}/v1"

    # Database Settings
    DATABASE_URL: str = "sqlite+aiosqlite:///../dev.db"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
