import numpy as np
import pytest

from ie_models.common.types import Transcript
from ie_models.vocal_analysis import count_fillers, measure_delivery

SR = 16_000


def words_at(n: int, start: float = 0.0, step: float = 0.4, length: float = 0.3, gap_after: dict | None = None):
    """n words of `length` s every `step` s; gap_after={index: extra_seconds} inserts pauses."""
    out, t = [], start
    for i in range(n):
        out.append((f"word{i}", round(t, 2), round(t + length, 2)))
        t += step + (gap_after or {}).get(i, 0.0)
    return out


def tone(seconds: float, amplitudes: list[float]) -> np.ndarray:
    """A 220 Hz tone whose amplitude steps through `amplitudes` in equal parts."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    env = np.repeat(amplitudes, int(np.ceil(n / len(amplitudes))))[:n]
    return (np.sin(2 * np.pi * 220 * t) * env).astype(np.float32)


def by_signal(report):
    return {m.signal: m for m in report.metrics}


def test_pace_pauses_and_steady_volume() -> None:
    words = words_at(50, gap_after={20: 4.0})  # one 4 s pause after word 20
    speaking = words[-1][2] - words[0][1]
    t = Transcript(text=" ".join(w for w, _, _ in words), words=words, word_probabilities=[0.95] * 50)
    m = by_signal(measure_delivery(tone(speaking + 1, [0.3]), t))

    assert m["speaking_pace"].status == "measured"
    assert m["speaking_pace"].value == round(50 / (speaking / 60))
    assert m["long_pauses"].value == 1
    assert m["long_pauses"].details["longest_s"] == pytest.approx(4.1, abs=0.05)
    assert m["volume"].value == "steady"


def test_volume_drop_detected() -> None:
    words = words_at(40)
    speaking = words[-1][2]
    audio = tone(speaking + 0.5, [0.4, 0.4, 0.05])  # last third ~18 dB quieter
    t = Transcript(text=" ".join(w for w, _, _ in words), words=words, word_probabilities=[0.9] * 40)
    vol = by_signal(measure_delivery(audio, t))["volume"]
    assert vol.value == "lower"
    assert vol.details["change_db"] < -6


def test_fillers_use_documented_list_only() -> None:
    text = "Um, so I think, like, we should uh basically ship it. You know, I mean the plan is fine. Hmm."
    counts = count_fillers(text)
    assert counts == {"um": 1, "uh": 1, "hmm": 1, "you know": 1, "i mean": 1}
    assert "like" not in counts and "so" not in counts and "basically" not in counts


def test_no_speech_means_could_not_calculate() -> None:
    report = measure_delivery(np.zeros(SR * 5, np.float32), Transcript(text=""))
    assert all(m.status == "not_available" and m.value is None for m in report.metrics)
    assert all(m.note.startswith("Could not calculate") for m in report.metrics)


def test_too_short_answer_is_not_estimated() -> None:
    words = words_at(6)
    t = Transcript(text="a b c d e f", words=words, word_probabilities=[0.9] * 6)
    m = by_signal(measure_delivery(tone(3, [0.3]), t))
    assert m["speaking_pace"].status == "not_available"
    assert m["filler_words"].status == "not_available"
    assert m["volume"].status == "not_available"


def test_unreliable_transcript_withholds_text_measurements() -> None:
    words = words_at(40)
    t = Transcript(text=" ".join(w for w, _, _ in words), words=words, word_probabilities=[0.2] * 40)
    m = by_signal(measure_delivery(tone(words[-1][2] + 0.5, [0.3]), t))
    for s in ("speaking_pace", "long_pauses", "filler_words"):
        assert m[s].status == "not_available"
        assert "unsure" in m[s].note
    assert m["volume"].status == "measured"  # the audio signal itself is still usable


def test_silent_audio_volume_not_available() -> None:
    words = words_at(40)
    t = Transcript(text=" ".join(w for w, _, _ in words), words=words, word_probabilities=[0.9] * 40)
    vol = by_signal(measure_delivery(np.zeros(int((words[-1][2] + 1) * SR), np.float32), t))["volume"]
    assert vol.status == "not_available"
