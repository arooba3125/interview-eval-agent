"""Adapter between the backend and the deep learning package in ../models (ie_models).

Everything ML-related goes through this file, so models can change without
touching routes or other services.
"""


class AnalysisService:
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
