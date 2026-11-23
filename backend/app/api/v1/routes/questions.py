"""Controller: serve the next question for a session (flow step 2)."""
from fastapi import APIRouter

from app.schemas.question import QuestionRead
from app.services.question_service import QuestionService

router = APIRouter()
service = QuestionService()


@router.get("/{session_id}/next-question", response_model=QuestionRead | None)
def next_question(session_id: str) -> QuestionRead | None:
    return service.next_question(session_id)
