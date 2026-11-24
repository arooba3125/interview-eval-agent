import type { DeliveryMetric, QuestionResult } from "./types";

// Answer-quality scoring (relevance, accuracy, completeness) is not implemented, so there are
// no score helpers here. Only formatting and aggregation of live measurements.

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Measured numeric values of one delivery signal across answers (skips "could not calculate"). */
export function measuredValues(results: QuestionResult[], signal: DeliveryMetric["signal"]): number[] {
  return results
    .map((r) => r.measured_delivery?.metrics.find((m) => m.signal === signal && m.status === "measured")?.value)
    .filter((v): v is number => typeof v === "number");
}

export interface DeliveryOverview {
  measuredAnswers: number;
  averagePace: number | null;
  longPauses: number | null;
  fillerWords: number | null;
}

/** Totals and averages over the answers that were actually measured. */
export function deliveryOverview(results: QuestionResult[]): DeliveryOverview {
  const paces = measuredValues(results, "speaking_pace");
  const pauses = measuredValues(results, "long_pauses");
  const fillers = measuredValues(results, "filler_words");
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return {
    measuredAnswers: results.filter((r) => r.measured_delivery?.metrics.some((m) => m.status === "measured")).length,
    averagePace: paces.length ? Math.round(sum(paces) / paces.length) : null,
    longPauses: pauses.length ? sum(pauses) : null,
    fillerWords: fillers.length ? sum(fillers) : null,
  };
}
