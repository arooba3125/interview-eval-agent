"""Feedback shown after each answer.

Content scores (knowledge, correctness) assess what was said.
Delivery items are observations (e.g. "3 pauses longer than 4 s"), not judgments
of confidence, anxiety or passion.
"""
from pydantic import BaseModel, Field


class ContentAssessment(BaseModel):
    transcript: str
    relevance: float = Field(ge=0, le=1)
    correctness: float = Field(ge=0, le=1)
    completeness: float = Field(ge=0, le=1)
    knowledge_level: str  # e.g. "basic", "working", "strong"
    covered_concepts: list[str] = []
    missing_concepts: list[str] = []


class DeliveryObservation(BaseModel):
    signal: str  # e.g. "speaking_pace", "long_pauses", "gaze_away_ratio"
    value: float | str
    note: str  # plain-language observation, never a verdict about the person


class AnswerFeedback(BaseModel):
    question_id: str
    content: ContentAssessment
    delivery: list[DeliveryObservation] = []
    suggestions: list[str] = []
