from fastapi.testclient import TestClient
from ie_models.common.types import GazeFrame, GazeResult

from app.api.v1.routes import analysis as analysis_routes
from app.core.config import settings
from app.main import app
from app.services.analysis_service import AnalysisService

URL = "/api/v1/analysis/gaze"
client = TestClient(app)


def post_frames(*frames: bytes):
    return client.post(URL, files=[("frames", (f"f{i}.jpg", f, "image/jpeg")) for i, f in enumerate(frames)])


class FakeGaze(AnalysisService):
    def estimate_gaze(self, frames: list[bytes]) -> GazeResult:
        per_frame = [GazeFrame(True, "toward_screen", 2.0, -8.0, 0.9) for _ in frames]
        return GazeResult("toward_screen", 0.9, 2.0, -8.0, per_frame, True, "fake")


class NoFace(AnalysisService):
    def estimate_gaze(self, frames: list[bytes]) -> GazeResult:
        return GazeResult(None, 0.0, frames=[GazeFrame(False) for _ in frames], face_detected=False, model="fake")


def test_missing_frames_rejected() -> None:
    assert client.post(URL).status_code == 422


def test_missing_model_returns_503(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        analysis_routes, "service", AnalysisService(gaze_model_dir=tmp_path / "none", face_landmarker_path=tmp_path / "x")
    )
    response = post_frames(b"\xff\xd8 not really a jpeg")
    assert response.status_code == 503
    assert "not found" in response.json()["detail"]


def test_too_many_frames_rejected(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(analysis_routes, "service", AnalysisService(gaze_model_dir=tmp_path / "none"))
    response = post_frames(*[b"x"] * 6)
    assert response.status_code == 422
    assert "at most 5" in response.json()["detail"]


def test_oversized_frame_returns_413(monkeypatch) -> None:
    monkeypatch.setattr(settings, "max_frame_upload_kb", 1)
    monkeypatch.setattr(analysis_routes, "service", FakeGaze())
    assert post_frames(b"x" * 2048).status_code == 413


def test_response_is_an_observation_not_an_assessment(monkeypatch) -> None:
    monkeypatch.setattr(analysis_routes, "service", FakeGaze())
    body = post_frames(b"a", b"b", b"c").json()
    assert body["analysis_type"] == "approximate_gaze_direction"
    assert body["direction"] == "toward_screen"
    assert body["confidence"] == 0.9
    assert body["frames_received"] == 3
    assert body["processed_locally"] is True
    assert body["frames_stored"] is False
    assert "not a psychological or candidate assessment" in body["notice"]
    assert "CC BY-NC-SA 4.0" in body["license"]


def test_no_face_is_not_an_error(monkeypatch) -> None:
    monkeypatch.setattr(analysis_routes, "service", NoFace())
    body = post_frames(b"a").json()
    assert body["direction"] is None
    assert body["face_detected"] is False
