import type { AnswerFeedback, Question, Session, SessionCreate, SessionSummary } from "../domain/types";
import type { InterviewApi } from "./interviewApi";
import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError("Could not reach the interview server. Check that the backend is running.");
  }
  if (!res.ok) throw new ApiError(`The server returned ${res.status} ${res.statusText}.`, res.status);
  return res.json() as Promise<T>;
}

/** Talks to the FastAPI backend. Selected when VITE_USE_MOCK_API=false. */
export const httpInterviewApi: InterviewApi = {
  mode: "http",

  createSession: (body: SessionCreate) =>
    request<Session>("/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  nextQuestion: (sessionId: string) => request<Question | null>(`/sessions/${sessionId}/next-question`),

  submitAnswer: (sessionId: string, questionId: string, recording: Blob) => {
    const form = new FormData();
    form.append("question_id", questionId);
    // One webm file carries the audio track (and the video track when the camera is on).
    form.append("audio", recording, "answer.webm");
    return request<AnswerFeedback>(`/sessions/${sessionId}/answers`, { method: "POST", body: form });
  },

  summary: (sessionId: string) => request<SessionSummary>(`/sessions/${sessionId}/summary`),
};

/** Kept for existing imports. Prefer `interviewApi` from ./interviewApi. */
export const api = httpInterviewApi;
