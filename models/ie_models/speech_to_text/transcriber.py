"""Speech-to-text. Planned: Whisper (small/medium) with word timestamps."""
from ie_models.common.types import Transcript


def transcribe(audio_bytes: bytes) -> Transcript:
    raise NotImplementedError("Load Whisper and return text with word timestamps.")
