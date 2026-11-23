import type { AnswerFeedback, Question, Session, SessionCreate, SessionSummary } from "../domain/types";
import { USE_MOCK_API } from "./config";
import { httpInterviewApi } from "./apiClient";
import { mockInterviewApi } from "./mock/mockInterviewApi";

/**
 * The one door from viewmodels to the backend. Both implementations follow the
 * FastAPI routes in backend/app/api/v1/routes, so swapping mock for HTTP is a config change.
 */
export interface InterviewApi {
  readonly mode: "mock" | "http";
  createSession(body: SessionCreate): Promise<Session>;
  nextQuestion(sessionId: string): Promise<Question | null>;
  /** `recording` is the webm from MediaRecorder: audio, plus video when the camera is on. */
  submitAnswer(sessionId: string, questionId: string, recording: Blob): Promise<AnswerFeedback>;
  summary(sessionId: string): Promise<SessionSummary>;
}

export const interviewApi: InterviewApi = USE_MOCK_API ? mockInterviewApi : httpInterviewApi;
