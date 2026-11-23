import type { QuestionResult, SessionRecord } from "../domain/types";
import { USE_MOCK_API } from "./config";
import { SAMPLE_SESSIONS } from "./mock/sampleSessions";

// Sessions are remembered in this browser only. The backend has no endpoint to list
// past sessions yet; when it does, replace these functions with API calls.

const KEY = "ie.history.v1";

function read(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

function write(records: SessionRecord[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // Storage full or blocked (private mode). History is a convenience, so carry on.
  }
}

const samples = (): SessionRecord[] => (USE_MOCK_API ? SAMPLE_SESSIONS : []);

export const historyStore = {
  /** Newest first. Includes the labelled sample sessions in demo mode. */
  list(): SessionRecord[] {
    return [...read(), ...samples()].sort((a, b) => b.started_at.localeCompare(a.started_at));
  },

  get(sessionId: string): SessionRecord | null {
    return [...read(), ...samples()].find((r) => r.session.id === sessionId) ?? null;
  },

  save(record: SessionRecord): void {
    write([record, ...read().filter((r) => r.session.id !== record.session.id)]);
  },

  appendResult(sessionId: string, result: QuestionResult): void {
    const record = read().find((r) => r.session.id === sessionId);
    if (!record) return;
    const results = record.results.filter((r) => r.question.id !== result.question.id);
    this.save({ ...record, results: [...results, result] });
  },

  complete(sessionId: string): void {
    const record = read().find((r) => r.session.id === sessionId);
    if (record && !record.completed_at) this.save({ ...record, completed_at: new Date().toISOString() });
  },

  remove(sessionId: string): void {
    write(read().filter((r) => r.session.id !== sessionId));
  },
};
