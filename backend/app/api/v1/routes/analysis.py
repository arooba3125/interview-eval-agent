"""Controller: experimental text emotion analysis of an answer transcript."""
from fastapi import APIRouter, HTTPException

from app.schemas.text_emotion import TextEmotionRequest, TextEmotionResponse
from app.services.analysis_service import (
    AnalysisService,
    EmptyTranscriptError,
    TextEmotionUnavailableError,
)

router = APIRouter()
service = AnalysisService()


@router.post(
    "/text-emotion",
    response_model=TextEmotionResponse,
    summary="Experimental text emotion analysis",
    responses={
        422: {"description": "Empty or invalid transcript"},
        503: {"description": "Text emotion model could not be loaded"},
    },
)
def analyze_text_emotion(payload: TextEmotionRequest) -> TextEmotionResponse:
    try:
        result = service.analyze_text_emotion(payload.transcript)
    except EmptyTranscriptError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TextEmotionUnavailableError as exc:
        raise HTTPException(status_code=503, detail=f"Text emotion model unavailable: {exc}") from exc
    return TextEmotionResponse.from_result(result)
