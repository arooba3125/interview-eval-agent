// Local implementation of InterviewApi: sessions and questions run in the browser, using the
// practice question bank. It produces no feedback or scores: every result shown in the app comes
// from the live models in the backend (transcription, delivery measurements, text emotion, gaze).

import type { InterviewApi } from "../interviewApi";
import type { Question, Session } from "../../domain/types";
import { pickQuestions, type PracticeQuestion } from "./questionBank";

interface LocalSessionState {
  session: Session;
  questions: PracticeQuestion[];
  answered: number;
}

// Key kept from earlier versions so sessions in progress can still be resumed.
const KEY = "ie.mock.sessions.v1";

function load(): Record<string, LocalSessionState> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, LocalSessionState>;
  } catch {
    return {};
  }
}

function save(all: Record<string, LocalSessionState>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function getState(sessionId: string): LocalSessionState {
  const state = load()[sessionId];
  if (!state) throw new Error("This practice session could not be found. It may have been started in another browser.");
  return state;
}

function toQuestion(sessionId: string, state: LocalSessionState, i: number): Question {
  const q = state.questions[i];
  return { id: `${sessionId}-q${i + 1}`, text: q.text, topic: q.topic, index: i + 1, total: state.questions.length };
}

export const localInterviewApi: InterviewApi = {
  mode: "local",

  async createSession(body) {
    const id = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const session: Session = {
      id,
      job_role: body.job_role,
      experience_level: body.experience_level,
      interview_type: body.interview_type,
      consent_video_analysis: body.consent_video_analysis,
    };
    save({ ...load(), [id]: { session, questions: pickQuestions(body.job_role, body.interview_type), answered: 0 } });
    return session;
  },

  async nextQuestion(sessionId) {
    const state = getState(sessionId);
    return state.answered < state.questions.length ? toQuestion(sessionId, state, state.answered) : null;
  },

  async submitAnswer(sessionId, questionId, recording) {
    if (recording.size === 0) throw new Error("The recording was empty. Record your answer again.");
    const all = load();
    const state = all[sessionId];
    if (!state) throw new Error("This practice session could not be found.");
    const i = state.questions.findIndex((_, n) => `${sessionId}-q${n + 1}` === questionId);
    if (i < 0) throw new Error("Unknown question.");
    state.answered = Math.max(state.answered, i + 1);
    save(all);
  },
};
