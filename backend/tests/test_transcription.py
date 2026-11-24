from fastapi.testclient import TestClient
from ie_models.common.types import Transcript

from app.api.v1.routes import analysis as analysis_routes
from app.core.config import settings
from app.main import app
from app.services.analysis_service import AnalysisService

URL = "/api/v1/analysis/transcribe"
client = TestClient(app)


def upload(data: bytes, name: str = "answer.webm", mime: str = "audio/webm"):
    return client.post(URL, files={"audio": (name, data, mime)})


class FakeSpeech(AnalysisService):
    def transcribe(self, audio_bytes: bytes) -> Transcript:
        return Transcript(
            text="I compare impact against effort.",
            words=[("I", 0.0, 0.2), ("compare", 0.2, 0.6)],
            duration_s=3.5,
            language="en",
            model="fake",
        )


class SilentSpeech(AnalysisService):
    def transcribe(self, audio_bytes: bytes) -> Transcript:
        return Transcript(text="", duration_s=4.0, model="fake")


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
