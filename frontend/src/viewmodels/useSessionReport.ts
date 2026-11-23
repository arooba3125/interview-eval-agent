import { useCallback, useEffect, useState } from "react";
import type { SessionRecord, SessionSummary } from "../domain/types";
import { averageContentScore } from "../domain/scoring";
import { historyStore } from "../services/historyStore";
import { interviewApi } from "../services/interviewApi";

type Status = "loading" | "ready" | "not-found" | "error";

/** ViewModel for the final report: the stored per-question results plus the API summary. */
export function useSessionReport(sessionId: string) {
  const [status, setStatus] = useState<Status>("loading");
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const r = historyStore.get(sessionId);
    if (!r) {
      setStatus("not-found");
      return;
    }
    setRecord(r);
    try {
      setSummary(await interviewApi.summary(sessionId));
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the summary.");
      setStatus("error");
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const results = record?.results ?? [];
  return {
    status, record, summary, error, results,
    overall: averageContentScore(results),
    totalQuestions: results[0]?.question.total ?? 0,
    retry: load,
  };
}
