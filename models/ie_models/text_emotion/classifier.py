"""Experimental text emotion analysis: BERT fine-tuned on GoEmotions (multi-label).

Loads the folder saved by model-training/text/finetune_goemotions.ipynb (weights, config,
tokenizer and inference_config.json) and reports which of the 28 GoEmotions labels are
expressed in the wording of a transcript.

The model was trained on Reddit comments, not interview answers, so results are
experimental. They describe the text only: they are not a measure of the candidate's
knowledge, correctness, confidence, anxiety, passion or job suitability.
"""
from __future__ import annotations

import json
import threading
from functools import lru_cache
from pathlib import Path

from ie_models.common.types import TextEmotionResult


class TextEmotionError(Exception):
    """Base class for text emotion errors."""


class EmptyTranscriptError(TextEmotionError, ValueError):
    """The transcript is missing, empty or only whitespace."""


class ModelLoadError(TextEmotionError, RuntimeError):
    """The saved model, tokenizer or inference_config.json could not be loaded."""


def clean_transcript(text: object) -> str:
    """Collapse whitespace and reject empty input."""
    if not isinstance(text, str):
        raise EmptyTranscriptError("Transcript must be a string.")
    cleaned = " ".join(text.split())
    if not cleaned:
        raise EmptyTranscriptError("Transcript is empty: there is no text to analyse.")
    return cleaned


def read_inference_config(model_dir: Path) -> dict:
    """Read and check inference_config.json (threshold, max_length, labels)."""
    path = model_dir / "inference_config.json"
    if not path.is_file():
        raise ModelLoadError(
            f"Missing {path}. Expected the model folder saved by finetune_goemotions.ipynb."
        )
    try:
        cfg = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ModelLoadError(f"Could not read {path}: {exc}") from exc

    threshold = cfg.get("threshold")
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or not 0 < threshold < 1:
        raise ModelLoadError(f"{path} must contain a threshold between 0 and 1, got {threshold!r}.")
    max_length = cfg.get("max_length", 128)
    if isinstance(max_length, bool) or not isinstance(max_length, int) or max_length < 16:
        raise ModelLoadError(f"{path} has an invalid max_length: {max_length!r}.")
    labels = cfg.get("labels")
    if not isinstance(labels, list) or not labels or not all(isinstance(x, str) for x in labels):
        raise ModelLoadError(f"{path} must contain a non-empty list of label names.")

    return {
        "threshold": float(threshold),
        "max_length": max_length,
        "labels": labels,
        "base_model": str(cfg.get("base_model", "bert")),
    }


class TextEmotionClassifier:
    """Loads the saved model once; call predict() for each transcript."""

    def __init__(self, model_dir: str | Path, device: str | None = None) -> None:
        self.model_dir = Path(model_dir)
        if not self.model_dir.is_dir():
            raise ModelLoadError(f"Text emotion model folder not found: {self.model_dir}")
        cfg = read_inference_config(self.model_dir)
        self.threshold: float = cfg["threshold"]
        self.max_length: int = cfg["max_length"]
        self.model_name = f"{cfg['base_model']} fine-tuned on GoEmotions"

        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer
        except ImportError as exc:
            raise ModelLoadError(
                'Text emotion analysis needs torch and transformers: pip install -e "../models[text]"'
            ) from exc
        self._torch = torch
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        try:
            # local_files_only: never download anything; use only the saved folder.
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir, local_files_only=True)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_dir, local_files_only=True
            )
        except Exception as exc:  # noqa: BLE001 - report any loading failure as one clear error
            raise ModelLoadError(f"Could not load the model or tokenizer from {self.model_dir}: {exc}") from exc
        self.model.to(self.device).eval()

        id2label = self.model.config.id2label
        self.labels = [id2label[i] for i in range(self.model.config.num_labels)]
        if self.labels != cfg["labels"]:
            raise ModelLoadError(
                "Labels in inference_config.json do not match the model's config.json "
                f"({len(cfg['labels'])} vs {len(self.labels)} labels)."
            )

    def predict(self, transcript: str) -> TextEmotionResult:
        text = clean_transcript(transcript)
        # The model was trained on inputs up to max_length tokens. A longer answer is split into
        # overlapping windows, and each label keeps its highest probability across the windows.
        encoded = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_length,
            stride=self.max_length // 4,
            return_overflowing_tokens=True,
            padding=True,
            return_tensors="pt",
        )
        encoded.pop("overflow_to_sample_mapping", None)
        inputs = {k: v.to(self.device) for k, v in encoded.items()}
        with self._torch.no_grad():
            probs = self._torch.sigmoid(self.model(**inputs).logits.float())
        per_label = probs.max(dim=0).values.cpu().tolist()

        ranked = sorted(zip(self.labels, per_label), key=lambda kv: kv[1], reverse=True)
        top_label, top_score = ranked[0]
        return TextEmotionResult(
            labels=[label for label, p in ranked if p >= self.threshold],
            scores={label: round(float(p), 4) for label, p in zip(self.labels, per_label)},
            top_label=top_label,
            top_score=round(float(top_score), 4),
            threshold=self.threshold,
            chunks=int(probs.shape[0]),
            model=self.model_name,
        )


@lru_cache(maxsize=2)
def _cached_classifier(model_dir: str) -> TextEmotionClassifier:
    # Failed loads raise and are not cached, so a fixed model folder works on the next call.
    return TextEmotionClassifier(model_dir)


_load_lock = threading.Lock()


def load_classifier(model_dir: str | Path) -> TextEmotionClassifier:
    # The server runs requests in a thread pool: without the lock, two first requests would
    # load the model at the same time and one could fail.
    with _load_lock:
        return _cached_classifier(str(Path(model_dir).resolve()))


def analyze_text_emotion(transcript: str, model_dir: str | Path) -> TextEmotionResult:
    """Entry point: validate the transcript, load the model once, return the result."""
    clean_transcript(transcript)  # reject empty input before loading the model
    return load_classifier(model_dir).predict(transcript)
