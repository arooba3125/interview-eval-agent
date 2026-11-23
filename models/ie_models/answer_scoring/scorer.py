"""Scores what the candidate said against the question and its expected key concepts.

Planned: relevance via sentence-embedding similarity, concept coverage against a
per-question rubric, correctness and knowledge level via a rubric-guided LLM or
fine-tuned classifier.
"""
from ie_models.common.types import ContentScore


def score_answer(question: str, transcript: str, key_concepts: list[str] | None = None) -> ContentScore:
    raise NotImplementedError
