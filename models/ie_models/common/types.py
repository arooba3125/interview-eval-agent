"""Data shapes passed between pipelines."""
from dataclasses import dataclass, field


@dataclass
class Transcript:
    text: str
    words: list[tuple[str, float, float]] = field(default_factory=list)  # (word, start_s, end_s)
    duration_s: float = 0.0  # length of the decoded audio
    language: str = "en"
    model: str = ""


@dataclass
class ContentScore:
    relevance: float
    correctness: float
    completeness: float
    knowledge_level: str
    covered_concepts: list[str] = field(default_factory=list)
    missing_concepts: list[str] = field(default_factory=list)


@dataclass
class TextEmotionResult:
    """Experimental: emotions expressed in the wording of a transcript.

    Not a measure of knowledge, correctness, confidence, anxiety, passion or job suitability.
    """
    labels: list[str]          # labels at or above the threshold, highest score first (may be empty)
    scores: dict[str, float]   # probability for every label
    top_label: str
    top_score: float
    threshold: float
    chunks: int = 1            # number of text windows a long transcript was split into
    model: str = ""


@dataclass
class Observation:
    """A measured signal plus a neutral, plain-language note. Never a verdict about the person."""
    signal: str
    value: float | str
    note: str
