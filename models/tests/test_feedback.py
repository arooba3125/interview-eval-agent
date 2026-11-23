from ie_models.common.types import ContentScore
from ie_models.feedback import build_suggestions


def test_missing_concepts_become_suggestions() -> None:
    score = ContentScore(0.8, 0.7, 0.5, "working", missing_concepts=["context switching"])
    assert build_suggestions(score, []) == ["Mention context switching in your answer."]
