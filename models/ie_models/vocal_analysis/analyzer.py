"""Speaking-style measurements: pace (words per minute), long pauses, filler words, volume change.

See delivery.py for the measurements and their thresholds. Pitch variation is not implemented.
"""
from ie_models.common.types import DeliveryReport, Observation, Transcript


def analyze(audio_bytes: bytes, transcript: Transcript) -> DeliveryReport:
    """Decode the recording and measure delivery against its transcript."""
    from ie_models.speech_to_text.transcriber import decode
    from ie_models.vocal_analysis.delivery import measure_delivery

    return measure_delivery(decode(audio_bytes), transcript)


def to_observations(report: DeliveryReport) -> list[Observation]:
    """Measured values only, as neutral observations."""
    return [Observation(m.signal, m.value, m.note) for m in report.metrics if m.status == "measured"]
