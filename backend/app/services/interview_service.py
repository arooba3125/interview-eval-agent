"""Interview flow: create sessions, track progress, build the final summary."""
import uuid

from app.repositories.session_repository import SessionRepository
from app.schemas.session import SessionCreate, SessionRead, SessionSummary


class InterviewService:
    def __init__(self, repo: SessionRepository | None = None) -> None:
        self.repo = repo or SessionRepository()

    def start_session(self, payload: SessionCreate) -> SessionRead:
        session = SessionRead(id=str(uuid.uuid4()), **payload.model_dump(exclude={"consent_audio_analysis"}))
        self.repo.save(session)
        return session

    def summarize(self, session_id: str) -> SessionSummary:
        # TODO: aggregate stored AnswerFeedback for the session.
        return SessionSummary(session_id=session_id, strengths=[], areas_to_improve=[], patterns=[])
