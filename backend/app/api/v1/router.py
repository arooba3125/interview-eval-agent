"""Collects every v1 route module into one router."""
from fastapi import APIRouter

from app.api.v1.routes import analysis, answers, questions, sessions

api_router = APIRouter()
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(questions.router, prefix="/sessions", tags=["questions"])
api_router.include_router(answers.router, prefix="/sessions", tags=["answers"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
