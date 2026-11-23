import type { AnswerFeedback, DeliveryObservation, QuestionResult } from "./types";

/** Mean of the content scores (0..1). Delivery cues are never part of a score. */
export function contentScore(feedback: AnswerFeedback): number {
  const { relevance, correctness, completeness } = feedback.content;
  return (relevance + correctness + completeness) / 3;
}

export function averageContentScore(results: QuestionResult[]): number | null {
  if (results.length === 0) return null;
  return results.reduce((sum, r) => sum + contentScore(r.feedback), 0) / results.length;
}

export type ScoreBand = "strong" | "developing" | "needs-work";

export function scoreBand(score: number): ScoreBand {
  if (score >= 0.75) return "strong";
  if (score >= 0.5) return "developing";
  return "needs-work";
}

export const SCORE_BAND_LABEL: Record<ScoreBand, string> = {
  strong: "Strong",
  developing: "Developing",
  "needs-work": "Needs work",
};

export const percent = (n: number) => `${Math.round(n * 100)}%`;

/** Display names and units for delivery signals sent by the backend. */
export const SIGNAL_INFO: Record<string, { label: string; unit?: string; group: "voice" | "camera" }> = {
  speaking_pace: { label: "Speaking pace", unit: "words/min", group: "voice" },
  long_pauses: { label: "Long pauses", unit: "pauses over 3 s", group: "voice" },
  filler_words: { label: "Filler words", unit: "count", group: "voice" },
  volume: { label: "Volume", group: "voice" },
  gaze_toward_camera: { label: "Looking toward camera", unit: "of answer time", group: "camera" },
  gaze_away_ratio: { label: "Looking away from camera", unit: "of answer time", group: "camera" },
};

export function signalInfo(o: DeliveryObservation) {
  return SIGNAL_INFO[o.signal] ?? { label: o.signal.replace(/_/g, " "), group: "voice" as const };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
