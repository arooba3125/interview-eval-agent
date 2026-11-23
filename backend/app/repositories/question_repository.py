"""Question bank access. Starts with a hard-coded sample; later load from the database."""
from app.schemas.question import QuestionRead

_SAMPLE = [
    QuestionRead(id="q1", text="Explain the difference between a process and a thread.", topic="operating systems", index=1, total=1),
]


class QuestionRepository:
    def first(self) -> QuestionRead | None:
        return _SAMPLE[0] if _SAMPLE else None
