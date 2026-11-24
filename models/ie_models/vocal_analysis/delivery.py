"""Delivery measurements from one recorded answer: pace, long pauses, filler words, volume change.

Inputs are the decoded audio (16 kHz mono float32) and the Whisper transcript with word
timestamps from speech_to_text. Every value is an observable measurement of how the answer was
delivered. None of them indicates confidence, anxiety, honesty, passion or job suitability.

When the input is too short or the recogniser was unsure, a measurement is returned with
status "not_available" and a reason, never an estimated or made-up value.

Thresholds (also documented in models/README.md):
  - Speaking time = first word start to last word end (leading/trailing silence excluded).
  - Pace needs >= MIN_WORDS words over >= MIN_SPEAKING_S seconds; reference band 120-160 wpm,
    a range commonly cited as comfortable for listeners (not a rule: styles vary).
  - A long pause is a gap of >= LONG_PAUSE_S seconds between two recognised words.
  - Fillers are counted from FILLER_WORDS / FILLER_PHRASES only (see below).
  - Volume: loudness (RMS, dBFS) of 250 ms windows inside recognised words; the median of the
    last third of speaking time is compared with the first third. A change of >= VOLUME_CHANGE_DB
    (about half / double the amplitude) is reported as "lower" / "higher", otherwise "steady".
  - Transcript-based measurements are withheld when the mean word confidence is below
    MIN_MEAN_WORD_PROB (the recogniser was unsure, e.g. noise or mumbling).
"""
from __future__ import annotations

import re

import numpy as np

from ie_models.common.types import DeliveryMetric, DeliveryReport, Transcript

SAMPLE_RATE = 16_000

MIN_WORDS = 10
MIN_SPEAKING_S = 5.0
MIN_MEAN_WORD_PROB = 0.5
LONG_PAUSE_S = 3.0
PACE_BAND_WPM = (120, 160)

# Hesitation sounds that carry no content. Words such as "like", "so", "well", "basically",
# "actually" and "right" are NOT counted: they are often meaningful, and counting them would
# overstate fillers. Whisper also tends to omit hesitations, so this count is a lower bound.
FILLER_WORDS = frozenset({"um", "umm", "uh", "uhh", "uhm", "er", "erm", "ah", "hmm", "hm", "mm", "mhm"})
FILLER_PHRASES = (("you", "know"), ("i", "mean"))

VOLUME_WINDOW_S = 0.25
VOLUME_CHANGE_DB = 6.0
MIN_VOLUME_SPEECH_S = 6.0
SILENCE_DBFS = -60.0  # speech quieter than this is treated as no usable signal

_WORD_RE = re.compile(r"[a-z']+")


def _not_available(signal: str, reason: str) -> DeliveryMetric:
    return DeliveryMetric(signal=signal, status="not_available", note=f"Could not calculate: {reason}")


def _tokens(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def measure_pace(words: list[tuple[str, float, float]], speaking_s: float) -> DeliveryMetric:
    content = [w for w in words if _tokens(w[0]) and _tokens(w[0])[0] not in FILLER_WORDS]
    if len(content) < MIN_WORDS or speaking_s < MIN_SPEAKING_S:
        return _not_available(
            "speaking_pace",
            f"needs at least {MIN_WORDS} recognised words over {MIN_SPEAKING_S:.0f} seconds of speech "
            f"(got {len(content)} words over {speaking_s:.1f} s).",
        )
    wpm = round(len(content) / (speaking_s / 60))
    lo, hi = PACE_BAND_WPM
    where = "within" if lo <= wpm <= hi else ("faster than" if wpm > hi else "slower than")
    return DeliveryMetric(
        signal="speaking_pace",
        status="measured",
        value=wpm,
        unit="words/min",
        note=f"About {wpm} words per minute ({len(content)} words over {speaking_s:.0f} s of speaking time), "
        f"{where} the {lo} to {hi} range many listeners find easy to follow.",
        details={"words": len(content), "speaking_s": round(speaking_s, 1)},
    )


def measure_pauses(words: list[tuple[str, float, float]], speaking_s: float) -> DeliveryMetric:
    if len(words) < 2 or speaking_s < MIN_SPEAKING_S:
        return _not_available("long_pauses", "too little recognised speech to measure gaps between words.")
    gaps = [(a[2], b[1]) for a, b in zip(words, words[1:]) if b[1] - a[2] >= LONG_PAUSE_S]
    longest = max((b[1] - a[2] for a, b in zip(words, words[1:])), default=0.0)
    n = len(gaps)
    note = (
        f"No gaps of {LONG_PAUSE_S:.0f} seconds or longer between words. Longest gap {longest:.1f} s."
        if n == 0
        else f"{n} gap{'s' if n > 1 else ''} of {LONG_PAUSE_S:.0f} seconds or longer between words "
        f"(longest {longest:.1f} s). Pausing to think is normal."
    )
    return DeliveryMetric(
        signal="long_pauses",
        status="measured",
        value=n,
        unit=f"pauses of {LONG_PAUSE_S:.0f} s or more",
        note=note,
        details={
            "threshold_s": LONG_PAUSE_S,
            "longest_s": round(longest, 1),
            "pauses": [{"start_s": round(s, 1), "end_s": round(e, 1)} for s, e in gaps],
        },
    )


def count_fillers(text: str) -> dict[str, int]:
    tokens = _tokens(text)
    counts: dict[str, int] = {}
    for t in tokens:
        if t in FILLER_WORDS:
            counts[t] = counts.get(t, 0) + 1
    for phrase in FILLER_PHRASES:
        n = sum(1 for i in range(len(tokens) - len(phrase) + 1) if tuple(tokens[i : i + len(phrase)]) == phrase)
        if n:
            counts[" ".join(phrase)] = n
    return counts


def measure_fillers(transcript: Transcript, speaking_s: float) -> DeliveryMetric:
    if len(transcript.words) < MIN_WORDS:
        return _not_available("filler_words", f"needs at least {MIN_WORDS} recognised words.")
    counts = count_fillers(transcript.text)
    total = sum(counts.values())
    per_min = round(total / (speaking_s / 60), 1) if speaking_s > 0 else None
    listed = ", ".join(f'"{k}" x{v}' for k, v in sorted(counts.items(), key=lambda kv: -kv[1]))
    note = (
        "No listed filler words were recognised."
        if total == 0
        else f"{total} filler word{'s' if total > 1 else ''} recognised ({listed})"
        + (f", about {per_min} per minute." if per_min is not None else ".")
    )
    return DeliveryMetric(
        signal="filler_words",
        status="measured",
        value=total,
        unit="count",
        note=note + " Counts only um, uh, er, ah, hmm, mm and similar, plus \"you know\" and \"I mean\".",
        details={"by_word": counts, "per_minute": per_min},
    )


def _window_db(audio: np.ndarray, words: list[tuple[str, float, float]]) -> list[tuple[float, float]]:
    """(time, dBFS) for each 250 ms window that lies inside a recognised word."""
    win = int(VOLUME_WINDOW_S * SAMPLE_RATE)
    out: list[tuple[float, float]] = []
    for _, start, end in words:
        a, b = int(start * SAMPLE_RATE), int(end * SAMPLE_RATE)
        for i in range(a, max(a, b - win) + 1, win):
            chunk = audio[i : i + win]
            if len(chunk) < win // 2:
                continue
            rms = float(np.sqrt(np.mean(np.square(chunk, dtype=np.float64))))
            out.append((i / SAMPLE_RATE, 20 * np.log10(max(rms, 1e-9))))
    return out


def measure_volume(audio: np.ndarray, words: list[tuple[str, float, float]], speaking_s: float) -> DeliveryMetric:
    if speaking_s < MIN_VOLUME_SPEECH_S or not words:
        return _not_available(
            "volume", f"needs at least {MIN_VOLUME_SPEECH_S:.0f} seconds of recognised speech."
        )
    windows = _window_db(audio, words)
    if len(windows) < 9:
        return _not_available("volume", "too few speech segments to compare.")
    levels = np.array([db for _, db in windows])
    if float(np.median(levels)) < SILENCE_DBFS:
        return _not_available("volume", "the speech signal is too quiet to measure reliably.")
    t0, t1 = words[0][1], words[-1][2]
    third = (t1 - t0) / 3
    first = [db for t, db in windows if t < t0 + third]
    last = [db for t, db in windows if t >= t1 - third]
    if len(first) < 3 or len(last) < 3:
        return _not_available("volume", "not enough speech at the start and end of the answer to compare.")
    change = round(float(np.median(last) - np.median(first)), 1)
    spread = round(float(np.percentile(levels, 90) - np.percentile(levels, 10)), 1)
    if change <= -VOLUME_CHANGE_DB:
        value, note = "lower", f"Volume in the last third was about {abs(change):.0f} dB lower than in the first third."
    elif change >= VOLUME_CHANGE_DB:
        value, note = "higher", f"Volume in the last third was about {change:.0f} dB higher than in the first third."
    else:
        value, note = "steady", f"Volume stayed within {VOLUME_CHANGE_DB:.0f} dB from start to end (change {change:+.1f} dB)."
    return DeliveryMetric(
        signal="volume",
        status="measured",
        value=value,
        note=note + " Relative to your own start, not an absolute loudness.",
        details={"change_db": change, "spread_db": spread, "threshold_db": VOLUME_CHANGE_DB},
    )


def measure_delivery(audio: np.ndarray, transcript: Transcript) -> DeliveryReport:
    """All four measurements; each is either measured or "not_available" with a reason."""
    words = [w for w in transcript.words if w[0].strip()]
    if not words:
        reason = "no speech was recognised in the recording."
        return DeliveryReport(
            metrics=[_not_available(s, reason) for s in ("speaking_pace", "long_pauses", "filler_words", "volume")],
            speaking_s=0.0,
        )
    speaking_s = max(0.0, words[-1][2] - words[0][1])
    probs = transcript.word_probabilities
    mean_prob = float(np.mean(probs)) if probs else 1.0
    if mean_prob < MIN_MEAN_WORD_PROB:
        reason = f"the speech recogniser was unsure of the words (mean word confidence {mean_prob:.0%})."
        text_metrics = [_not_available(s, reason) for s in ("speaking_pace", "long_pauses", "filler_words")]
    else:
        text_metrics = [
            measure_pace(words, speaking_s),
            measure_pauses(words, speaking_s),
            measure_fillers(transcript, speaking_s),
        ]
    return DeliveryReport(
        metrics=[*text_metrics, measure_volume(audio, words, speaking_s)],
        speaking_s=round(speaking_s, 1),
        mean_word_confidence=round(mean_prob, 3),
    )
