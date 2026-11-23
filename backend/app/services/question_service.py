"""Chooses the next question for a session from the prepared question bank."""
from app.repositories.question_repository import QuestionRepository
from app.schemas.question import QuestionRead


class QuestionService:
    def __init__(self, repo: QuestionRepository | None = None) -> None:
        self.repo = repo or QuestionRepository()

    def next_question(self, session_id: str) -> QuestionRead | None:
        # TODO: pick by session role/level and skip questions already answered.
        return self.repo.first()
