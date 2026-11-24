from fastapi.testclient import TestClient
from ie_models.common.types import TextEmotionResult

from app.api.v1.routes import analysis as analysis_routes
from app.main import app
from app.services.analysis_service import AnalysisService

URL = "/api/v1/analysis/text-emotion"
client = TestClient(app)


class FakeAnalysis(AnalysisService):
    def analyze_text_emotion(self, transcript: str) -> TextEmotionResult:
        return TextEmotionResult(
            labels=["gratitude"],
            scores={"gratitude": 0.91, "neutral": 0.12},
            top_label="gratitude",
            top_score=0.91,
            threshold=0.3,
            model="fake",
        )


def test_empty_transcript_is_rejected(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(analysis_routes, "service", AnalysisService(tmp_path / "no-model"))
    response = client.post(URL, json={"transcript": "   \n "})
    assert response.status_code == 422
    assert "empty" in response.json()["detail"].lower()


def test_missing_transcript_field_is_rejected() -> None:
    assert client.post(URL, json={}).status_code == 422


def test_missing_model_returns_503(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(analysis_routes, "service", AnalysisService(tmp_path / "no-model"))
    response = client.post(URL, json={"transcript": "Thanks for having me."})
    assert response.status_code == 503
    assert "not found" in response.json()["detail"]


def test_response_is_labelled_experimental(monkeypatch) -> None:
    monkeypatch.setattr(analysis_routes, "service", FakeAnalysis())
    body = client.post(URL, json={"transcript": "Thanks for having me."}).json()
    assert body["analysis_type"] == "experimental_text_emotion"
    assert body["experimental"] is True
    assert "not a measure" in body["notice"]
    assert body["detected_labels"] == ["gratitude"]
    assert body["top_label"] == {"label": "gratitude", "score": 0.91}
    assert body["scores"]["neutral"] == 0.12
