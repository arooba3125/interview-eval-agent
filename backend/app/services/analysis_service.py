"""Adapter between the backend and the deep learning package in ../models (ie_models).

Everything ML-related goes through this file, so models can change without
touching routes or other services.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

from app.core.config import settings

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from ie_models.common.types import DeliveryReport, GazeResult, TextEmotionResult, Transcript


class EmptyTranscriptError(ValueError):
    """The transcript has no text to analyse."""


class TextEmotionUnavailableError(RuntimeError):
    """The text emotion model could not be loaded."""


class InvalidAudioError(ValueError):
    """The recording is empty or cannot be decoded as audio."""


class SpeechToTextUnavailableError(RuntimeError):
    """The speech-to-text model could not be loaded."""


class InvalidFrameError(ValueError):
    """A camera frame is missing, too many were sent, or one is not a decodable image."""


class GazeUnavailableError(RuntimeError):
    """The gaze model or face landmarker could not be loaded."""


class AnalysisService:
    def __init__(
        self,
        text_emotion_model_dir: str | Path | None = None,
        speech_model_dir: str | Path | None = None,
        gaze_model_dir: str | Path | None = None,
        face_landmarker_path: str | Path | None = None,
    ) -> None:
        self.text_emotion_model_dir = Path(text_emotion_model_dir or settings.text_emotion_model_dir)
        self.speech_model_dir = Path(speech_model_dir or settings.speech_model_dir)
        self.gaze_model_dir = Path(gaze_model_dir or settings.gaze_model_dir)
        self.face_landmarker_path = Path(face_landmarker_path or settings.face_landmarker_path)

    def estimate_gaze(self, frames: list[bytes]) -> GazeResult:
        """Approximate gaze direction from 1-5 camera frames, processed in memory on this machine."""
        try:
            from ie_models import visual_analysis
        except ImportError as exc:
            raise GazeUnavailableError(f'Gaze estimation dependencies are missing ({exc}): pip install -e "../models[visual]"') from exc
        try:
            return visual_analysis.estimate_gaze(frames, self.gaze_model_dir, self.face_landmarker_path)
        except visual_analysis.InvalidFrameError as exc:
            raise InvalidFrameError(str(exc)) from exc
        except visual_analysis.ModelLoadError as exc:
            raise GazeUnavailableError(str(exc)) from exc

    def transcribe(self, audio_bytes: bytes) -> tuple[Transcript, DeliveryReport]:
        """Speech-to-text of a recorded answer (local Whisper), plus delivery measurements
        (pace, long pauses, filler words, volume change) from the same decoded audio."""
        try:
            from ie_models import speech_to_text, vocal_analysis
            from ie_models.common.types import DeliveryMetric, DeliveryReport
        except ImportError as exc:
            raise SpeechToTextUnavailableError(
                'ie_models is not installed: run pip install -e "../models[speech]"'
            ) from exc
        try:
            transcript, audio = speech_to_text.transcribe_with_audio(audio_bytes, self.speech_model_dir)
        except (speech_to_text.EmptyAudioError, speech_to_text.AudioDecodeError) as exc:
            raise InvalidAudioError(str(exc)) from exc
        except speech_to_text.ModelLoadError as exc:
            raise SpeechToTextUnavailableError(str(exc)) from exc
        try:
            delivery = vocal_analysis.measure_delivery(audio, transcript)
        except Exception:  # noqa: BLE001 - never invent values: report "could not calculate"
            logger.exception("Delivery measurement failed")
            note = "Could not calculate: the measurement failed for this recording."
            delivery = DeliveryReport(
                metrics=[DeliveryMetric(s, "not_available", note=note)
                         for s in ("speaking_pace", "long_pauses", "filler_words", "volume")]
            )
        return transcript, delivery

    def score_content(self, question: str, transcript: str) -> dict:
        # TODO: from ie_models.answer_scoring import score_answer
        return {}

    def analyze_voice(self, audio_bytes: bytes) -> dict:
        # TODO: from ie_models.vocal_analysis import analyze
        return {}

    def analyze_video(self, video_bytes: bytes) -> dict:
        # TODO: whole-video analysis (facial/hand movement), only with consent. Gaze: estimate_gaze().
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
