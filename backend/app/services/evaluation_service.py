"""Runs the three analysis paths on one answer and combines them into feedback."""
from fastapi import UploadFile

from app.schemas.feedback import AnswerFeedback, ContentAssessment
from app.services.analysis_service import AnalysisService


class EvaluationService:
    def __init__(self, analysis: AnalysisService | None = None) -> None:
        self.analysis = analysis or AnalysisService()

    async def evaluate_answer(
        self, session_id: str, question_id: str, audio: UploadFile, video: UploadFile | None
    ) -> AnswerFeedback:
        audio_bytes = await audio.read()
        transcript = self.analysis.transcribe(audio_bytes)
        # TODO: score content, analyse voice, analyse video (if consented), build suggestions.
        content = ContentAssessment(
            transcript=transcript,
            relevance=0.0,
            correctness=0.0,
            completeness=0.0,
            knowledge_level="unknown",
        )
        return AnswerFeedback(question_id=question_id, content=content)
