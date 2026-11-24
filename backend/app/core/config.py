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
    # Pretrained Whisper weights for faster-whisper (speech-to-text runs locally on the CPU).
    speech_model_dir: Path = REPO_ROOT / "models" / "checkpoints" / "faster-whisper-base.en"
    # Largest recording accepted by POST /analysis/transcribe.
    max_audio_upload_mb: int = 50
    # Gaze estimation (approximate visual observation; weights trained on MPIIFaceGaze, CC BY-NC-SA 4.0).
    gaze_model_dir: Path = REPO_ROOT / "models" / "checkpoints" / "gaze-mpiifacegaze-resnet-simple"
    face_landmarker_path: Path = REPO_ROOT / "models" / "checkpoints" / "mediapipe" / "face_landmarker.task"
    # Kept under Starlette's 1 MB in-memory spool limit, so uploaded frames never touch the disk.
    max_frame_upload_kb: int = 1000


settings = Settings()
