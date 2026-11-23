"""Session storage. In-memory for now; swap for the SQLAlchemy tables in app/db later."""
from app.schemas.session import SessionRead

_SESSIONS: dict[str, SessionRead] = {}


class SessionRepository:
    def save(self, session: SessionRead) -> None:
        _SESSIONS[session.id] = session

    def get(self, session_id: str) -> SessionRead | None:
        return _SESSIONS.get(session_id)
