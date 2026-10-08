"""Application configuration settings for MatchaJob AI Worker."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Service Information
    SERVICE_NAME: str = "matchajob-ai-worker"
    VERSION: str = "1.0.0"

    # Environment & Network
    APP_ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Port Configuration (Host port 8001, Container port 8000)
    AI_WORKER_HOST_PORT: int = 8001
    AI_WORKER_CONTAINER_PORT: int = 8000

    # Phase 3 Configuration placeholders
    AI_PROVIDER: str = "openai"
    AI_MODEL: str = "gpt-4o-mini"
    AI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
