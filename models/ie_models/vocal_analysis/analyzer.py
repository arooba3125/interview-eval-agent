"""Speaking-style measurements: pace (words per minute), pauses, volume, pitch variation."""
from ie_models.common.types import Observation, Transcript


def analyze(audio_bytes: bytes, transcript: Transcript) -> list[Observation]:
    raise NotImplementedError
