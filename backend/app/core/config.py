"""App settings, read from environment variables or backend/.env."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./interview.db"
    cors_origins: str = "http://localhost:5173"
    enable_visual_analysis: bool = False
    # Folder saved by model-training/text/finetune_goemotions.ipynb (experimental text emotion analysis).
    text_emotion_model_dir: Path = (
        REPO_ROOT / "model-training" / "text" / "outputs" / "bert-goemotions-full" / "model"
    )


settings = Settings()
