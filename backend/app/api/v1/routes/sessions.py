"""Controller: start an interview and fetch its end-of-interview summary (flow steps 1 and 7)."""
from fastapi import APIRouter

from app.schemas.session import SessionCreate, SessionRead, SessionSummary
from app.services.interview_service import InterviewService

router = APIRouter()
service = InterviewService()


@router.post("", response_model=SessionRead)
def create_session(payload: SessionCreate) -> SessionRead:
    return service.start_session(payload)


@router.get("/{session_id}/summary", response_model=SessionSummary)
def get_summary(session_id: str) -> SessionSummary:
    return service.summarize(session_id)
