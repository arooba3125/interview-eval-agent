"""Speech-to-text with a pretrained Whisper model (faster-whisper, CTranslate2 int8 on CPU).

Loads a model folder already on disk (default: models/checkpoints/faster-whisper-base.en) and
never downloads anything at run time, so audio is processed entirely on this machine.

Accepts the browser recording as-is (webm/opus, mp4/aac, ogg, wav...): PyAV, installed with
faster-whisper, decodes it, so no system ffmpeg is needed. Video containers work too; only the
audio track is read.

The transcript is a machine transcription of what was said. It is not an assessment of the
candidate's knowledge, correctness, confidence, anxiety, passion or job suitability.
"""
from __future__ import annotations

import io
import threading
from functools import lru_cache
from pathlib import Path

from ie_models.common.types import Transcript


class SpeechToTextError(Exception):
    """Base class for speech-to-text errors."""


class EmptyAudioError(SpeechToTextError, ValueError):
    """No audio bytes were given, or the audio decodes to nothing."""


class AudioDecodeError(SpeechToTextError, ValueError):
    """The bytes are not an audio/video format that can be decoded."""


class ModelLoadError(SpeechToTextError, RuntimeError):
    """The speech model folder is missing or could not be loaded."""


SAMPLE_RATE = 16_000  # Whisper expects 16 kHz mono
# Whisper sometimes invents a closing phrase over trailing noise or silence ("I'll see you in the
# next one."). Such segments have a low average log-probability together with a raised no-speech
# probability, or words with no duration; they are dropped. Real speech scored around -0.15 / 0.0.
HALLUCINATION_LOGPROB = -1.0
HALLUCINATION_NO_SPEECH = 0.3


def _is_hallucination(seg) -> bool:
    if seg.avg_logprob >= HALLUCINATION_LOGPROB:
        return False
    words = seg.words or []
    zero_length = sum(1 for w in words if w.end - w.start < 0.01)
    return seg.no_speech_prob > HALLUCINATION_NO_SPEECH or (words and zero_length >= len(words) / 2)


class SpeechTranscriber:
    """Loads the Whisper model once; call transcribe() for each recording."""

    def __init__(self, model_dir: str | Path, device: str = "cpu", compute_type: str = "int8") -> None:
        self.model_dir = Path(model_dir)
        if not (self.model_dir / "model.bin").is_file():
            raise ModelLoadError(
                f"Speech model not found in {self.model_dir} (expected model.bin). "
                "See models/README.md for how to download faster-whisper-base.en."
            )
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise ModelLoadError('Speech-to-text needs faster-whisper: pip install -e "../models[speech]"') from exc
        try:
            # A local folder path: faster-whisper loads it directly and makes no network calls.
            self.model = WhisperModel(str(self.model_dir), device=device, compute_type=compute_type)
        except Exception as exc:  # noqa: BLE001 - report any loading failure as one clear error
            raise ModelLoadError(f"Could not load the speech model from {self.model_dir}: {exc}") from exc
        self.model_name = f"Whisper {self.model_dir.name.removeprefix('faster-whisper-')} (faster-whisper)"
        self.english_only = self.model_dir.name.endswith(".en")

    def transcribe(self, audio_bytes: bytes) -> Transcript:
        return self.transcribe_samples(decode(audio_bytes))

    def transcribe_samples(self, audio) -> Transcript:
        """Transcribe already-decoded 16 kHz mono float32 samples."""
        duration = len(audio) / SAMPLE_RATE
        segments, info = self.model.transcribe(
            audio,
            language="en" if self.english_only else None,
            beam_size=5,
            vad_filter=True,  # skip long silences; uses the Silero VAD bundled with faster-whisper
            word_timestamps=True,
            condition_on_previous_text=False,  # fewer repeated phrases on long answers
            # No temperature fallback: on a 23 s answer the retries only re-decoded trailing noise
            # (later dropped as a hallucination) and made transcription about 3x slower.
            temperature=0.0,
        )
        parts: list[str] = []
        words: list[tuple[str, float, float]] = []
        probs: list[float] = []
        for seg in segments:  # a generator: decoding happens here
            if _is_hallucination(seg):
                continue
            parts.append(seg.text.strip())
            for w in seg.words or []:
                words.append((w.word.strip(), round(float(w.start), 2), round(float(w.end), 2)))
                probs.append(round(float(w.probability), 3))
        return Transcript(
            text=" ".join(p for p in parts if p),
            words=words,
            word_probabilities=probs,
            duration_s=round(duration, 2),
            language=info.language,
            model=self.model_name,
        )


def decode(audio_bytes: bytes):
    """Decode any container PyAV understands into 16 kHz mono float32 samples."""
    if not audio_bytes:
        raise EmptyAudioError("The recording is empty: no audio was received.")
    from faster_whisper.audio import decode_audio

    try:
        audio = decode_audio(io.BytesIO(audio_bytes), sampling_rate=SAMPLE_RATE)
    except Exception as exc:  # noqa: BLE001 - PyAV raises several error types for bad input
        raise AudioDecodeError(f"The recording could not be decoded as audio: {exc}") from exc
    if audio.size == 0:
        raise EmptyAudioError("The recording contains no audio samples.")
    return audio


@lru_cache(maxsize=2)
def _cached_transcriber(model_dir: str) -> SpeechTranscriber:
    # Failed loads raise and are not cached, so a fixed model folder works on the next call.
    return SpeechTranscriber(model_dir)


_load_lock = threading.Lock()


def load_transcriber(model_dir: str | Path) -> SpeechTranscriber:
    # Serialise the first load: concurrent requests must not load the model twice at once.
    with _load_lock:
        return _cached_transcriber(str(Path(model_dir).resolve()))


def transcribe_with_audio(audio_bytes: bytes, model_dir: str | Path):
    """Like transcribe(), but also returns the decoded 16 kHz samples (for delivery measurements)."""
    if not audio_bytes:
        raise EmptyAudioError("The recording is empty: no audio was received.")
    transcriber = load_transcriber(model_dir)
    audio = decode(audio_bytes)
    return transcriber.transcribe_samples(audio), audio


def transcribe(audio_bytes: bytes, model_dir: str | Path) -> Transcript:
    """Entry point: reject empty input, load the model once, return the transcript."""
    if not audio_bytes:
        raise EmptyAudioError("The recording is empty: no audio was received.")
    return load_transcriber(model_dir).transcribe(audio_bytes)
