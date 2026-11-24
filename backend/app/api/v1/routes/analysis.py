"""Controller: speech-to-text of a recorded answer, and experimental text emotion analysis."""
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.schemas.text_emotion import TextEmotionRequest, TextEmotionResponse
from app.schemas.transcription import TranscriptionResponse
from app.services.analysis_service import (
    AnalysisService,
    EmptyTranscriptError,
    InvalidAudioError,
    SpeechToTextUnavailableError,
    TextEmotionUnavailableError,
)

router = APIRouter()
service = AnalysisService()


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Transcribe a recorded answer (local Whisper)",
    responses={
        413: {"description": "Recording is larger than the upload limit"},
        422: {"description": "Empty recording, or audio that cannot be decoded"},
        503: {"description": "Speech-to-text model could not be loaded"},
    },
)
def transcribe_answer(audio: UploadFile = File(..., description="The recording (webm, mp4, ogg or wav)")) -> TranscriptionResponse:
    # A plain def runs in FastAPI's thread pool, so CPU-bound transcription does not block the server.
    limit = settings.max_audio_upload_mb * 1024 * 1024
    data = audio.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"The recording is larger than {settings.max_audio_upload_mb} MB.")
    try:
        result = service.transcribe(data)
    except InvalidAudioError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except SpeechToTextUnavailableError as exc:
        raise HTTPException(status_code=503, detail=f"Speech-to-text model unavailable: {exc}") from exc
    return TranscriptionResponse.from_result(result)


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
