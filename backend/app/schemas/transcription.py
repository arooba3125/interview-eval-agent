"""Response shape for POST /api/v1/analysis/transcribe."""
from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from ie_models.common.types import Transcript

TRANSCRIPTION_NOTICE = (
    "Automatic transcription. It can mishear words, so review and correct it. "
    "It records what was said; it does not assess knowledge, correctness, confidence, "
    "anxiety, passion or job suitability."
)


class TranscriptWord(BaseModel):
    word: str
    start_s: float
    end_s: float


class TranscriptionResponse(BaseModel):
    transcript: str = Field(description="Recognised text; empty when no speech was detected.")
    speech_detected: bool
    duration_s: float = Field(description="Length of the decoded audio in seconds.")
    language: str
    words: list[TranscriptWord]
    model: str
    processed_locally: bool = True
    notice: str = TRANSCRIPTION_NOTICE

    @classmethod
    def from_result(cls, result: Transcript) -> TranscriptionResponse:
        return cls(
            transcript=result.text,
            speech_detected=bool(result.text.strip()),
            duration_s=result.duration_s,
            language=result.language,
            words=[TranscriptWord(word=w, start_s=s, end_s=e) for w, s, e in result.words],
            model=result.model,
        )
