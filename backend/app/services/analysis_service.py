"""Adapter between the backend and the deep learning package in ../models (ie_models).

Everything ML-related goes through this file, so models can change without
touching routes or other services.
"""
from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from ie_models.common.types import TextEmotionResult


class EmptyTranscriptError(ValueError):
    """The transcript has no text to analyse."""


class TextEmotionUnavailableError(RuntimeError):
    """The text emotion model could not be loaded."""


class AnalysisService:
    def __init__(self, text_emotion_model_dir: str | Path | None = None) -> None:
        self.text_emotion_model_dir = Path(text_emotion_model_dir or settings.text_emotion_model_dir)

    def transcribe(self, audio_bytes: bytes) -> str:
        # TODO: from ie_models.speech_to_text import transcribe
        return ""

    def score_content(self, question: str, transcript: str) -> dict:
        # TODO: from ie_models.answer_scoring import score_answer
        return {}

    def analyze_voice(self, audio_bytes: bytes) -> dict:
        # TODO: from ie_models.vocal_analysis import analyze
        return {}

    def analyze_video(self, video_bytes: bytes) -> dict:
        # TODO: from ie_models.visual_analysis import analyze (only with consent)
        return {}

    def analyze_text_emotion(self, transcript: str) -> TextEmotionResult:
        """Experimental: emotions expressed in the transcript's wording (BERT on GoEmotions)."""
        try:
            from ie_models import text_emotion
        except ImportError as exc:
            raise TextEmotionUnavailableError(
                'ie_models is not installed: run pip install -e "../models[text]"'
            ) from exc
        try:
            return text_emotion.analyze_text_emotion(transcript, self.text_emotion_model_dir)
        except text_emotion.EmptyTranscriptError as exc:
            raise EmptyTranscriptError(str(exc)) from exc
        except text_emotion.ModelLoadError as exc:
            raise TextEmotionUnavailableError(str(exc)) from exc
