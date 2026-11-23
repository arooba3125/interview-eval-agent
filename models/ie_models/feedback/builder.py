"""Turns content scores and delivery observations into specific, actionable suggestions."""
from ie_models.common.types import ContentScore, Observation


def build_suggestions(content: ContentScore, delivery: list[Observation]) -> list[str]:
    suggestions = [f"Mention {c} in your answer." for c in content.missing_concepts]
    # TODO: add delivery-based tips, e.g. "Try a short pause instead of filler words."
    return suggestions
