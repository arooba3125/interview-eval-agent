from pydantic import BaseModel


class SessionCreate(BaseModel):
    job_role: str
    experience_level: str  # e.g. "junior", "mid", "senior"
    interview_type: str  # e.g. "technical", "behavioural"
    consent_audio_analysis: bool = True
    consent_video_analysis: bool = False


class SessionRead(BaseModel):
    id: str
    job_role: str
    experience_level: str
    interview_type: str
    consent_video_analysis: bool


class SessionSummary(BaseModel):
    session_id: str
    strengths: list[str]
    areas_to_improve: list[str]
    patterns: list[str]
