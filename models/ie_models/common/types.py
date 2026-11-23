"""Data shapes passed between pipelines."""
from dataclasses import dataclass, field


@dataclass
class Transcript:
    text: str
    words: list[tuple[str, float, float]] = field(default_factory=list)  # (word, start_s, end_s)


@dataclass
class ContentScore:
    relevance: float
    correctness: float
    completeness: float
    knowledge_level: str
    covered_concepts: list[str] = field(default_factory=list)
    missing_concepts: list[str] = field(default_factory=list)


@dataclass
class Observation:
    """A measured signal plus a neutral, plain-language note. Never a verdict about the person."""
    signal: str
    value: float | str
    note: str
