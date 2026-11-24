import json
from pathlib import Path

import pytest

from ie_models.text_emotion import (
    EmptyTranscriptError,
    ModelLoadError,
    TextEmotionClassifier,
    analyze_text_emotion,
    clean_transcript,
)

MODEL_DIR = (
    Path(__file__).resolve().parents[2]
    / "model-training" / "text" / "outputs" / "bert-goemotions-full" / "model"
)


@pytest.mark.parametrize("text", ["", "   ", "\n\t ", None, 42])
def test_empty_or_non_text_is_rejected(text) -> None:
    with pytest.raises(EmptyTranscriptError):
        clean_transcript(text)


def test_whitespace_is_collapsed() -> None:
    assert clean_transcript("  I  enjoyed\nthat project. ") == "I enjoyed that project."


def test_empty_transcript_is_rejected_before_loading(tmp_path) -> None:
    with pytest.raises(EmptyTranscriptError):
        analyze_text_emotion("  ", tmp_path / "missing")


def test_missing_model_folder(tmp_path) -> None:
    with pytest.raises(ModelLoadError, match="not found"):
        TextEmotionClassifier(tmp_path / "missing")


def test_missing_inference_config(tmp_path) -> None:
    with pytest.raises(ModelLoadError, match="inference_config.json"):
        TextEmotionClassifier(tmp_path)


@pytest.mark.parametrize("threshold", [0, 1.5, "0.3", None, True])
def test_invalid_threshold(tmp_path, threshold) -> None:
    (tmp_path / "inference_config.json").write_text(
        json.dumps({"threshold": threshold, "max_length": 128, "labels": ["joy"]})
    )
    with pytest.raises(ModelLoadError, match="threshold"):
        TextEmotionClassifier(tmp_path)


@pytest.mark.skipif(not MODEL_DIR.is_dir(), reason="trained model not present")
def test_real_model_prediction() -> None:
    pytest.importorskip("transformers")
    result = analyze_text_emotion("Thank you so much, I really appreciate the opportunity!", MODEL_DIR)
    assert len(result.scores) == 28
    assert all(0 <= p <= 1 for p in result.scores.values())
    assert result.top_label == max(result.scores, key=result.scores.get)
    assert all(result.scores[label] >= result.threshold - 1e-4 for label in result.labels)
    assert "gratitude" in result.labels
