"""Controller: receive a recorded answer and return per-question feedback (flow steps 3 to 5)."""
from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.feedback import AnswerFeedback
from app.services.evaluation_service import EvaluationService

router = APIRouter()
service = EvaluationService()


@router.post("/{session_id}/answers", response_model=AnswerFeedback)
async def submit_answer(
    session_id: str,
    question_id: str = Form(...),
    audio: UploadFile = File(...),
    video: UploadFile | None = File(None),
) -> AnswerFeedback:
    return await service.evaluate_answer(session_id, question_id, audio, video)
