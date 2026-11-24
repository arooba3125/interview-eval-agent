import type { QuestionResult, SessionRecord } from "../domain/types";

// Sessions are remembered in this browser only. The backend has no endpoint to list
// past sessions yet; when it does, replace these functions with API calls.
//
// Only the user's own sessions are listed: there are no built-in example sessions.

const KEY = "ie.history.v1";

/** Older versions saved demo sessions and sample feedback; keep only the user's own, live fields. */
function clean(record: SessionRecord & { is_sample?: boolean }): SessionRecord | null {
  if (record.is_sample) return null;
  return {
    session: record.session,
    camera_enabled: record.camera_enabled,
    started_at: record.started_at,
    completed_at: record.completed_at,
    results: (record.results ?? []).map((r) => ({
      question: r.question,
      answer_duration_s: r.answer_duration_s,
      answered_at: r.answered_at,
      ...(r.measured_delivery !== undefined && { measured_delivery: r.measured_delivery }),
      ...(r.text_emotion !== undefined && { text_emotion: r.text_emotion }),
    })),
  };
}

function read(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SessionRecord[]) : [];
    const records = parsed.map(clean).filter((r): r is SessionRecord => r !== null);
    // One-time clean-up: drop stored sample feedback / demo flags from older versions.
    if (raw && /"feedback"|"is_sample"/.test(raw)) write(records);
    return records;
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

export const historyStore = {
  /** Newest first. */
  list(): SessionRecord[] {
    return read().sort((a, b) => b.started_at.localeCompare(a.started_at));
  },

  get(sessionId: string): SessionRecord | null {
    return read().find((r) => r.session.id === sessionId) ?? null;
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

  /** Adds a result that arrives after the answer was saved (e.g. the text emotion analysis). */
  updateResult(sessionId: string, questionId: string, patch: Partial<QuestionResult>): void {
    const record = read().find((r) => r.session.id === sessionId);
    if (!record) return;
    this.save({ ...record, results: record.results.map((r) => (r.question.id === questionId ? { ...r, ...patch } : r)) });
  },

  complete(sessionId: string): void {
    const record = read().find((r) => r.session.id === sessionId);
    if (record && !record.completed_at) this.save({ ...record, completed_at: new Date().toISOString() });
  },

  remove(sessionId: string): void {
    write(read().filter((r) => r.session.id !== sessionId));
  },
};
