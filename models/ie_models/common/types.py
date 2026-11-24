"""Data shapes passed between pipelines."""
from dataclasses import dataclass, field


@dataclass
class Transcript:
    text: str
    words: list[tuple[str, float, float]] = field(default_factory=list)  # (word, start_s, end_s)
    word_probabilities: list[float] = field(default_factory=list)  # recogniser confidence per word, 0..1
    duration_s: float = 0.0  # length of the decoded audio
    language: str = "en"
    model: str = ""


@dataclass
class DeliveryMetric:
    """One delivery measurement, or "not_available" with the reason in `note`. Never a verdict."""

    signal: str  # speaking_pace | long_pauses | filler_words | volume
    status: str  # measured | not_available
    value: float | str | None = None
    unit: str = ""
    note: str = ""
    details: dict = field(default_factory=dict)


@dataclass
class DeliveryReport:
    metrics: list[DeliveryMetric]
    speaking_s: float = 0.0
    mean_word_confidence: float | None = None


@dataclass
class GazeFrame:
    """Approximate gaze estimate for one camera frame (a visual observation only)."""

    face_detected: bool
    direction: str | None = None  # toward_screen | left | right | up | down
    horizontal_deg: float = 0.0  # + = toward the image's right (the candidate's own left)
    vertical_deg: float = 0.0  # + = up
    confidence: float = 0.0  # heuristic 0..1, not a calibrated probability


@dataclass
class GazeResult:
    """Combined estimate for a short frame sequence."""

    direction: str | None  # None when no face was found in any frame
    confidence: float
    horizontal_deg: float = 0.0
    vertical_deg: float = 0.0
    frames: list[GazeFrame] = field(default_factory=list)
    face_detected: bool = False
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
