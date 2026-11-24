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

export interface LabelScore {
  label: string;
  score: number;
}

/**
 * Experimental text emotion analysis (POST /analysis/text-emotion). Describes emotions
 * expressed in the wording only: not knowledge, correctness, confidence, anxiety, passion
 * or job suitability.
 */
export interface TextEmotionResult {
  analysis_type: "experimental_text_emotion";
  experimental: true;
  notice: string;
  /** Labels at or above the threshold, highest first. May be empty. */
  detected_labels: string[];
  /** Probability (0..1) for every label. */
  scores: Record<string, number>;
  top_label: LabelScore;
  threshold: number;
  chunks: number;
  model: string;
}

export interface SessionSummary {
  session_id: string;
  strengths: string[];
  areas_to_improve: string[];
  patterns: string[];
}

// ---------------------------------------------------------------------------
// Frontend-only types. The backend has no equivalent yet.
// ---------------------------------------------------------------------------

export type ExperienceLevel = "intern" | "junior" | "mid" | "senior";
export type InterviewType = "technical" | "behavioural" | "mixed";

/** What the candidate picks on the setup form, before consent is given. */
export interface InterviewConfig {
  job_role: string;
  experience_level: ExperienceLevel;
  interview_type: InterviewType;
}

/** One answered question with its feedback, kept for the final report. */
export interface QuestionResult {
  question: Question;
  feedback: AnswerFeedback;
  answer_duration_s: number;
  answered_at: string;
}

/**
 * A practice session as the browser remembers it (localStorage). Used for the
 * report and the previous-sessions list until the backend stores sessions.
 */
export interface SessionRecord {
  session: Session;
  camera_enabled: boolean;
  started_at: string;
  completed_at: string | null;
  results: QuestionResult[];
  /** True for the built-in example sessions shown in demo mode. */
  is_sample: boolean;
}
