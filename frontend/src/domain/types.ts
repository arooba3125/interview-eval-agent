// Mirrors backend/app/schemas. Keep these in sync.

export interface SessionCreate {
  job_role: string;
  experience_level: string;
  interview_type: string;
  consent_audio_analysis: boolean;
  consent_video_analysis: boolean;
}

export interface Session {
  id: string;
  job_role: string;
  experience_level: string;
  interview_type: string;
  consent_video_analysis: boolean;
}

export interface Question {
  id: string;
  text: string;
  topic: string;
  index: number;
  total: number;
}

export interface ContentAssessment {
  transcript: string;
  relevance: number;
  correctness: number;
  completeness: number;
  knowledge_level: string;
  covered_concepts: string[];
  missing_concepts: string[];
}

/** A measured delivery signal with a neutral note. Not a judgment of confidence or anxiety. */
export interface DeliveryObservation {
  signal: string;
  value: number | string;
  note: string;
}

export interface AnswerFeedback {
  question_id: string;
  content: ContentAssessment;
  delivery: DeliveryObservation[];
  suggestions: string[];
}

export interface SessionSummary {
  session_id: string;
  strengths: string[];
  areas_to_improve: string[];
  patterns: string[];
}
