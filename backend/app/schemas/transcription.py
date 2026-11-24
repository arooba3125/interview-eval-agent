"""Response shape for POST /api/v1/analysis/transcribe."""
from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from ie_models.common.types import DeliveryReport, Transcript

DELIVERY_NOTICE = (
    "Observable delivery measurements from this recording: pace, long pauses, filler words and "
    "relative volume. They describe how the answer was delivered, not the person: they do not "
    "indicate confidence, anxiety, honesty, passion or job suitability."
)

TRANSCRIPTION_NOTICE = (
    "Automatic transcription. It can mishear words, so review and correct it. "
    "It records what was said; it does not assess knowledge, correctness, confidence, "
    "anxiety, passion or job suitability."
)


class TranscriptWord(BaseModel):
    word: str
    start_s: float
    end_s: float


class DeliveryMetricResponse(BaseModel):
    signal: Literal["speaking_pace", "long_pauses", "filler_words", "volume"]
    status: Literal["measured", "not_available"]
    value: float | str | None = Field(description="Null when status is not_available.")
    unit: str
    note: str = Field(description="Plain-language description, or why it could not be calculated.")
    details: dict


class DeliveryResponse(BaseModel):
    analysis_type: Literal["measured_delivery"] = "measured_delivery"
    metrics: list[DeliveryMetricResponse]
    speaking_s: float = Field(description="First recognised word to last, in seconds.")
    mean_word_confidence: float | None
    notice: str = DELIVERY_NOTICE

    @classmethod
    def from_report(cls, report: DeliveryReport) -> DeliveryResponse:
        return cls(
            metrics=[
                DeliveryMetricResponse(
                    signal=m.signal, status=m.status, value=m.value, unit=m.unit, note=m.note, details=m.details
                )
                for m in report.metrics
            ],
            speaking_s=report.speaking_s,
            mean_word_confidence=report.mean_word_confidence,
        )


class TranscriptionResponse(BaseModel):
    transcript: str = Field(description="Recognised text; empty when no speech was detected.")
    speech_detected: bool
    duration_s: float = Field(description="Length of the decoded audio in seconds.")
    language: str
    words: list[TranscriptWord]
    model: str
    processed_locally: bool = True
    notice: str = TRANSCRIPTION_NOTICE
    delivery: DeliveryResponse | None = Field(
        None, description="Delivery measurements from the same recording (pace, pauses, fillers, volume)."
    )

    @classmethod
    def from_result(cls, result: Transcript, delivery: DeliveryReport | None = None) -> TranscriptionResponse:
        return cls(
            delivery=DeliveryResponse.from_report(delivery) if delivery is not None else None,
            transcript=result.text,
            speech_detected=bool(result.text.strip()),
            duration_s=result.duration_s,
            language=result.language,
            words=[TranscriptWord(word=w, start_s=s, end_s=e) for w, s, e in result.words],
            model=result.model,
        )
