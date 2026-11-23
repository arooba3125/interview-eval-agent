// Demo-mode implementation of InterviewApi. Same shapes as the FastAPI routes, but all
// questions and feedback are SAMPLE data generated in the browser.

import type { InterviewApi } from "../interviewApi";
import type { Question, Session } from "../../domain/types";
import { historyStore } from "../historyStore";
import { buildSummary, generateFeedback } from "./mockFeedback";
import { pickQuestions, type MockQuestion } from "./questionBank";

interface MockSessionState {
  session: Session;
  questions: MockQuestion[];
  answered: number;
}

const KEY = "ie.mock.sessions.v1";
const ANALYSIS_DELAY_MS = 2400;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function load(): Record<string, MockSessionState> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, MockSessionState>;
  } catch {
    return {};
  }
}

function save(all: Record<string, MockSessionState>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function getState(sessionId: string): MockSessionState {
  const state = load()[sessionId];
  if (!state) throw new Error("This practice session could not be found. It may have been started in another browser.");
  return state;
}

function toQuestion(sessionId: string, state: MockSessionState, i: number): Question {
  const q = state.questions[i];
  return { id: `${sessionId}-q${i + 1}`, text: q.text, topic: q.topic, index: i + 1, total: state.questions.length };
}

export const mockInterviewApi: InterviewApi = {
  mode: "mock",

  async createSession(body) {
    await delay(500);
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
    await delay(350);
    const state = getState(sessionId);
    return state.answered < state.questions.length ? toQuestion(sessionId, state, state.answered) : null;
  },

  async submitAnswer(sessionId, questionId, recording) {
    if (recording.size === 0) throw new Error("The recording was empty. Record your answer again.");
    await delay(ANALYSIS_DELAY_MS);
    const all = load();
    const state = all[sessionId];
    if (!state) throw new Error("This practice session could not be found.");
    const i = state.questions.findIndex((_, n) => `${sessionId}-q${n + 1}` === questionId);
    if (i < 0) throw new Error("Unknown question.");
    const q = state.questions[i];
    state.answered = Math.max(state.answered, i + 1);
    save(all);
    return generateFeedback(questionId, q, {
      seed: questionId,
      withCameraCues: state.session.consent_video_analysis,
      behavioural: q.kind === "behavioural",
    });
  },

  async summary(sessionId) {
    await delay(600);
    return buildSummary(sessionId, historyStore.get(sessionId)?.results ?? []);
  },
};
