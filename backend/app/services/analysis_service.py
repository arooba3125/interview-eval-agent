"""Adapter between the backend and the deep learning package in ../models (ie_models).

Everything ML-related goes through this file, so models can change without
touching routes or other services.
"""
from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from ie_models.common.types import TextEmotionResult, Transcript


class EmptyTranscriptError(ValueError):
    """The transcript has no text to analyse."""


class TextEmotionUnavailableError(RuntimeError):
    """The text emotion model could not be loaded."""


class InvalidAudioError(ValueError):
    """The recording is empty or cannot be decoded as audio."""


class SpeechToTextUnavailableError(RuntimeError):
    """The speech-to-text model could not be loaded."""


class AnalysisService:
    def __init__(
        self,
        text_emotion_model_dir: str | Path | None = None,
        speech_model_dir: str | Path | None = None,
    ) -> None:
        self.text_emotion_model_dir = Path(text_emotion_model_dir or settings.text_emotion_model_dir)
        self.speech_model_dir = Path(speech_model_dir or settings.speech_model_dir)

    def transcribe(self, audio_bytes: bytes) -> Transcript:
        """Speech-to-text of a recorded answer, run locally (Whisper via faster-whisper)."""
        try:
            from ie_models import speech_to_text
        except ImportError as exc:
            raise SpeechToTextUnavailableError(
                'ie_models is not installed: run pip install -e "../models[speech]"'
            ) from exc
        try:
            return speech_to_text.transcribe(audio_bytes, self.speech_model_dir)
        except (speech_to_text.EmptyAudioError, speech_to_text.AudioDecodeError) as exc:
            raise InvalidAudioError(str(exc)) from exc
        except speech_to_text.ModelLoadError as exc:
            raise SpeechToTextUnavailableError(str(exc)) from exc

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
