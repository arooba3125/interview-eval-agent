"""App settings, read from environment variables or backend/.env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./interview.db"
    cors_origins: str = "http://localhost:5173"
    enable_visual_analysis: bool = False


settings = Settings()
