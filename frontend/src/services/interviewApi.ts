import type { Question, Session, SessionCreate } from "../domain/types";
import { USE_LOCAL_QUESTIONS } from "./config";
import { httpInterviewApi } from "./apiClient";
import { localInterviewApi } from "./local/localInterviewApi";

/**
 * The one door from viewmodels to the interview flow (sessions, questions, answer progress).
 * It returns no feedback: results come from the live analysis services (transcription,
 * delivery, text emotion, gaze), which are called directly.
 */
export interface InterviewApi {
  readonly mode: "local" | "http";
  createSession(body: SessionCreate): Promise<Session>;
  nextQuestion(sessionId: string): Promise<Question | null>;
  /** Marks the question answered. `recording` is the webm from MediaRecorder. */
  submitAnswer(sessionId: string, questionId: string, recording: Blob): Promise<void>;
}

export const interviewApi: InterviewApi = USE_LOCAL_QUESTIONS ? localInterviewApi : httpInterviewApi;
