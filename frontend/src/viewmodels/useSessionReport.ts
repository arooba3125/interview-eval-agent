import { useMemo, useState } from "react";
import type { SessionRecord } from "../domain/types";
import { deliveryOverview } from "../domain/scoring";
import { historyStore } from "../services/historyStore";

/**
 * ViewModel for the final report: the answers saved in this browser with their live results
 * (measured delivery, text emotion). Nothing is generated: overall answer-quality scoring and
 * written strengths/weaknesses are not implemented.
 */
export function useSessionReport(sessionId: string) {
  const [record] = useState<SessionRecord | null>(() => historyStore.get(sessionId));
  const results = record?.results ?? [];
  const delivery = useMemo(() => deliveryOverview(results), [results]);
  return {
    status: record ? ("ready" as const) : ("not-found" as const),
    record,
    results,
    delivery,
    totalQuestions: results[0]?.question.total ?? 0,
  };
}
