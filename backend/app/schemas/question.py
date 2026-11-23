from pydantic import BaseModel


class QuestionRead(BaseModel):
    id: str
    text: str
    topic: str
    index: int
    total: int
