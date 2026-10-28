from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemma_model: str = "gemma-4-26b-a4b-it"
    inference_provider: str = "gemini_api"
    allowed_origins: str = "http://localhost:5173"
    rate_limit: str = "20/minute"
    model_timeout_seconds: int = 30
    log_level: str = "INFO"
    app_env: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def validate_deployment_settings(self) -> "Settings":
        if self.app_env.strip().lower() == "production":
            origins = self.cors_origins
            if not origins or "*" in origins:
                raise ValueError("Production ALLOWED_ORIGINS must list explicit origins.")
            if any(origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1") for origin in origins):
                raise ValueError("Production ALLOWED_ORIGINS cannot include local development origins.")
        return self

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def is_ai_configured(self) -> bool:
        return bool(self.gemini_api_key and self.gemini_api_key.strip())

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
