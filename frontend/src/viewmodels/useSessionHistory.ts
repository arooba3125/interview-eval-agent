import { useCallback, useMemo, useState } from "react";
import type { SessionRecord } from "../domain/types";
import { averageContentScore } from "../domain/scoring";
import { historyStore } from "../services/historyStore";

export interface SessionListItem {
  record: SessionRecord;
  score: number | null;
  answered: number;
  total: number;
}

/** ViewModel for the previous-sessions list. */
export function useSessionHistory() {
  const [records, setRecords] = useState<SessionRecord[]>(() => historyStore.list());
  const [roleFilter, setRoleFilter] = useState("all");

  const items: SessionListItem[] = useMemo(
    () =>
      records
        .filter((r) => roleFilter === "all" || r.session.job_role === roleFilter)
        .map((r) => ({
          record: r,
          score: averageContentScore(r.results),
          answered: r.results.length,
          total: r.results[0]?.question.total ?? 0,
        })),
    [records, roleFilter],
  );

  const roles = useMemo(() => Array.from(new Set(records.map((r) => r.session.job_role))).sort(), [records]);

  const remove = useCallback((id: string) => {
    historyStore.remove(id);
    setRecords(historyStore.list());
  }, []);

  return { items, roles, roleFilter, setRoleFilter, remove, totalCount: records.length };
}
