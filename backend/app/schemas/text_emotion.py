"""Experimental text emotion analysis of an answer transcript.

Describes emotions expressed in the wording only. It is not a measure of the candidate's
knowledge, correctness, confidence, anxiety, passion or job suitability.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from ie_models.common.types import TextEmotionResult

TEXT_EMOTION_NOTICE = (
    "Experimental text emotion analysis. It describes emotions expressed in the wording of the "
    "transcript, using a model trained on Reddit comments (GoEmotions). It is not a measure of "
    "the candidate's knowledge, correctness, confidence, anxiety, passion or job suitability."
)


class TextEmotionRequest(BaseModel):
    transcript: str = Field(max_length=20_000, description="The candidate's answer transcript.")


class LabelScore(BaseModel):
    label: str
    score: float = Field(ge=0, le=1)


class TextEmotionResponse(BaseModel):
    analysis_type: Literal["experimental_text_emotion"] = "experimental_text_emotion"
    experimental: Literal[True] = True
    notice: str = TEXT_EMOTION_NOTICE
    detected_labels: list[str]  # at or above the threshold, highest first; may be empty
    scores: dict[str, float]  # probability for each of the 28 labels
    top_label: LabelScore  # highest-scoring label, even if below the threshold
    threshold: float
    chunks: int  # text windows used (long transcripts are split)
    model: str

    @classmethod
    def from_result(cls, result: TextEmotionResult) -> TextEmotionResponse:
        return cls(
            detected_labels=result.labels,
            scores=result.scores,
            top_label=LabelScore(label=result.top_label, score=result.top_score),
            threshold=result.threshold,
            chunks=result.chunks,
            model=result.model,
        )
