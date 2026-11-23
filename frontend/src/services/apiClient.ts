import type { AnswerFeedback, Question, Session, SessionCreate, SessionSummary } from "../domain/types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  createSession: (body: SessionCreate) =>
    request<Session>("/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  nextQuestion: (sessionId: string) => request<Question | null>(`/sessions/${sessionId}/next-question`),

  submitAnswer: (sessionId: string, questionId: string, audio: Blob, video?: Blob) => {
    const form = new FormData();
    form.append("question_id", questionId);
    form.append("audio", audio, "answer.webm");
    if (video) form.append("video", video, "answer-video.webm");
    return request<AnswerFeedback>(`/sessions/${sessionId}/answers`, { method: "POST", body: form });
  },

  summary: (sessionId: string) => request<SessionSummary>(`/sessions/${sessionId}/summary`),
};
