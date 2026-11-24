from fastapi.testclient import TestClient
from ie_models.common.types import DeliveryMetric, DeliveryReport, Transcript

from app.api.v1.routes import analysis as analysis_routes
from app.core.config import settings
from app.main import app
from app.services.analysis_service import AnalysisService

URL = "/api/v1/analysis/transcribe"
client = TestClient(app)


def upload(data: bytes, name: str = "answer.webm", mime: str = "audio/webm"):
    return client.post(URL, files={"audio": (name, data, mime)})


NA = "Could not calculate: no speech was recognised in the recording."


class FakeSpeech(AnalysisService):
    def transcribe(self, audio_bytes: bytes):
        transcript = Transcript(
            text="I compare impact against effort.",
            words=[("I", 0.0, 0.2), ("compare", 0.2, 0.6)],
            duration_s=3.5,
            language="en",
            model="fake",
        )
        delivery = DeliveryReport(
            metrics=[
                DeliveryMetric("speaking_pace", "measured", 140, "words/min", "About 140 words per minute."),
                DeliveryMetric("long_pauses", "measured", 1, "pauses of 3 s or more", "1 gap.", {"longest_s": 3.4}),
                DeliveryMetric("filler_words", "measured", 2, "count", "2 filler words.", {"by_word": {"um": 2}}),
                DeliveryMetric("volume", "not_available", note="Could not calculate: too short."),
            ],
            speaking_s=20.0,
            mean_word_confidence=0.9,
        )
        return transcript, delivery


class SilentSpeech(AnalysisService):
    def transcribe(self, audio_bytes: bytes):
        signals = ("speaking_pace", "long_pauses", "filler_words", "volume")
        return Transcript(text="", duration_s=4.0, model="fake"), DeliveryReport(
            metrics=[DeliveryMetric(s, "not_available", note=NA) for s in signals]
        )


def test_missing_file_is_rejected() -> None:
    assert client.post(URL).status_code == 422


def test_empty_recording_is_rejected(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(analysis_routes, "service", AnalysisService(speech_model_dir=tmp_path / "no-model"))
    response = upload(b"")
    assert response.status_code == 422
    assert "empty" in response.json()["detail"].lower()


def test_undecodable_audio_is_rejected(monkeypatch) -> None:
    # Uses the real decoder (PyAV) but fails before the model is needed.
    response = upload(b"this is not audio at all" * 10)
    assert response.status_code in (422, 503)
    if response.status_code == 422:
        assert "decoded" in response.json()["detail"]


def test_missing_model_returns_503(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(analysis_routes, "service", AnalysisService(speech_model_dir=tmp_path / "no-model"))
    response = upload(b"\x1aE\xdf\xa3 not really webm")
    assert response.status_code == 503
    assert "not found" in response.json()["detail"]


def test_too_large_recording_returns_413(monkeypatch) -> None:
    monkeypatch.setattr(settings, "max_audio_upload_mb", 0)
    monkeypatch.setattr(analysis_routes, "service", FakeSpeech())
    assert upload(b"x").status_code == 413


def test_transcript_response(monkeypatch) -> None:
    monkeypatch.setattr(analysis_routes, "service", FakeSpeech())
    body = upload(b"fake audio").json()
    assert body["transcript"] == "I compare impact against effort."
    assert body["speech_detected"] is True
    assert body["processed_locally"] is True
    assert body["duration_s"] == 3.5
    assert body["words"][1] == {"word": "compare", "start_s": 0.2, "end_s": 0.6}
    assert "does not assess" in body["notice"]


def test_no_speech_is_not_an_error(monkeypatch) -> None:
    monkeypatch.setattr(analysis_routes, "service", SilentSpeech())
    body = upload(b"fake audio").json()
    assert body["transcript"] == ""
    assert body["speech_detected"] is False


def test_delivery_measurements_returned(monkeypatch) -> None:
    monkeypatch.setattr(analysis_routes, "service", FakeSpeech())
    delivery = upload(b"fake audio").json()["delivery"]
    assert delivery["analysis_type"] == "measured_delivery"
    by_signal = {m["signal"]: m for m in delivery["metrics"]}
    assert by_signal["speaking_pace"] == {
        "signal": "speaking_pace", "status": "measured", "value": 140, "unit": "words/min",
        "note": "About 140 words per minute.", "details": {},
    }
    assert by_signal["filler_words"]["details"] == {"by_word": {"um": 2}}
    # Never a made-up value when it could not be calculated.
    assert by_signal["volume"]["status"] == "not_available"
    assert by_signal["volume"]["value"] is None
    assert "do not indicate confidence" in delivery["notice"]


def test_no_speech_gives_no_values(monkeypatch) -> None:
    monkeypatch.setattr(analysis_routes, "service", SilentSpeech())
    metrics = upload(b"fake audio").json()["delivery"]["metrics"]
    assert {m["status"] for m in metrics} == {"not_available"}
    assert all(m["value"] is None for m in metrics)
