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

/**
 * Response of POST /api/v1/analysis/transcribe: a machine transcription of the recording,
 * made by a local Whisper model. It records what was said; it assesses nothing.
 */
/** One delivery measurement from the actual recording, or "not_available" with the reason. */
export interface DeliveryMetric {
  signal: "speaking_pace" | "long_pauses" | "filler_words" | "volume";
  status: "measured" | "not_available";
  /** Null when status is "not_available": never an estimate. */
  value: number | string | null;
  unit: string;
  /** Plain-language description, or "Could not calculate: <reason>". */
  note: string;
  details: Record<string, unknown>;
}

/** Delivery measurements returned with the transcript (POST /analysis/transcribe). */
export interface DeliveryMeasurements {
  analysis_type: "measured_delivery";
  metrics: DeliveryMetric[];
  speaking_s: number;
  mean_word_confidence: number | null;
  notice: string;
}

export interface TranscriptionResult {
  /** Empty when no speech was detected. */
  transcript: string;
  speech_detected: boolean;
  duration_s: number;
  language: string;
  words: { word: string; start_s: number; end_s: number }[];
  model: string;
  processed_locally: boolean;
  notice: string;
  /** Pace, long pauses, filler words and volume change measured from the same recording. */
  delivery: DeliveryMeasurements | null;
}

export type GazeDirection = "toward_screen" | "left" | "right" | "up" | "down";

/**
 * Response of POST /api/v1/analysis/gaze: an approximate visual observation of where the eyes
 * point, from a few camera frames analysed locally. Not a psychological or candidate assessment.
 */
export interface GazeResult {
  analysis_type: "approximate_gaze_direction";
  /** Null when no face was found in any frame. */
  direction: GazeDirection | null;
  /** 0..1 heuristic (agreement across frames), not a calibrated probability. */
  confidence: number;
  horizontal_deg: number;
  vertical_deg: number;
  face_detected: boolean;
  frames_received: number;
  model: string;
  processed_locally: boolean;
  frames_stored: boolean;
  notice: string;
  license: string;
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

/**
 * One answered question, kept for the final report. Only live results are stored: no audio,
 * no camera frames and no transcript text. Records saved by older versions may carry other
 * fields (such as sample feedback); they are ignored and never shown.
 */
export interface QuestionResult {
  question: Question;
  answer_duration_s: number;
  answered_at: string;
  /**
   * Delivery measured from the actual recording (numbers and notes only).
   * null = could not be measured; absent = saved by an older version.
   */
  measured_delivery?: DeliveryMeasurements | null;
  /** Experimental text emotion output for the reviewed transcript; null = did not run or failed. */
  text_emotion?: TextEmotionResult | null;
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
}
