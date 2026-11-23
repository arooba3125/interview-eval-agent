// Generates SAMPLE feedback for demo mode. Nothing here listens to or looks at the
// recording: numbers come from a seeded generator so the demo is repeatable.

import type { AnswerFeedback, DeliveryObservation, QuestionResult, SessionSummary } from "../../domain/types";
import { contentScore } from "../../domain/scoring";
import type { MockQuestion } from "./questionBank";

/** Small seeded PRNG (mulberry32) so the same session always gets the same sample. */
export function seededRandom(seedText: string): () => number {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (Math.imul(31, seed) + seedText.charCodeAt(i)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rnd: () => number, lo: number, hi: number) => lo + (hi - lo) * rnd();
const round2 = (n: number) => Math.round(n * 100) / 100;

export function generateFeedback(
  questionId: string,
  question: MockQuestion,
  opts: { seed: string; withCameraCues: boolean; behavioural: boolean },
): AnswerFeedback {
  const rnd = seededRandom(opts.seed);
  const relevance = round2(between(rnd, 0.62, 0.95));
  const correctness = round2(between(rnd, 0.5, 0.92));
  const completeness = round2(between(rnd, 0.4, 0.88));
  const coveredCount = Math.max(1, Math.min(question.concepts.length - 1, Math.round(completeness * question.concepts.length)));
  const covered = question.concepts.slice(0, coveredCount);
  const missing = question.concepts.slice(coveredCount);
  const avg = (relevance + correctness + completeness) / 3;

  const pace = Math.round(between(rnd, 108, 176));
  const pauses = Math.floor(between(rnd, 0, 5));
  const fillers = Math.floor(between(rnd, 1, 9));
  const volumeSteady = rnd() > 0.35;

  const delivery: DeliveryObservation[] = [
    {
      signal: "speaking_pace",
      value: pace,
      note:
        pace > 160
          ? `About ${pace} words per minute, faster than the 120 to 160 range many listeners find easy to follow.`
          : pace < 120
            ? `About ${pace} words per minute, slower than the 120 to 160 range many listeners find easy to follow.`
            : `About ${pace} words per minute, within the 120 to 160 range many listeners find easy to follow.`,
    },
    {
      signal: "long_pauses",
      value: pauses,
      note: pauses === 0 ? "No pauses longer than 3 seconds." : `${pauses} pause${pauses > 1 ? "s" : ""} longer than 3 seconds.`,
    },
    { signal: "filler_words", value: fillers, note: `${fillers} filler words such as "um" or "like".` },
    {
      signal: "volume",
      value: volumeSteady ? "steady" : "dropped",
      note: volumeSteady ? "Volume stayed steady through the answer." : "Volume dropped in the last part of the answer.",
    },
  ];
  if (opts.withCameraCues) {
    const gaze = round2(between(rnd, 0.52, 0.88));
    delivery.push({
      signal: "gaze_toward_camera",
      value: gaze,
      note: `Face was oriented toward the camera for about ${Math.round(gaze * 100)}% of the answer.`,
    });
  }

  const suggestions = [
    ...missing.slice(0, 2).map((c) => `Add a sentence on ${c}; it is a key point interviewers often look for here.`),
    opts.behavioural
      ? "Structure the story as Situation, Task, Action, Result, and spend most of the time on your own actions."
      : "Open with a one-line direct answer, then give the reasoning and a short example.",
  ];
  if (pace > 160) suggestions.push("Try slowing down slightly and pausing briefly between main points.");
  if (pauses >= 3) suggestions.push("If you need thinking time, say so briefly (\"Let me think about that for a moment\").");
  if (!volumeSteady) suggestions.push("Keep your voice up through the final point so the conclusion lands clearly.");

  return {
    question_id: questionId,
    content: {
      transcript: "",
      relevance,
      correctness,
      completeness,
      knowledge_level: avg >= 0.78 ? "strong" : avg >= 0.6 ? "working" : "basic",
      covered_concepts: covered,
      missing_concepts: missing,
    },
    delivery,
    suggestions,
  };
}

/** Sample end-of-interview summary built from the per-question sample feedback. */
export function buildSummary(sessionId: string, results: QuestionResult[]): SessionSummary {
  if (results.length === 0) return { session_id: sessionId, strengths: [], areas_to_improve: [], patterns: [] };

  const sorted = [...results].sort((a, b) => contentScore(b.feedback) - contentScore(a.feedback));
  const best = sorted.slice(0, 2);
  const weakest = sorted[sorted.length - 1];

  const strengths = best.map(
    (r) => `${r.question.topic}: covered ${r.feedback.content.covered_concepts.slice(0, 2).join(" and ")} clearly.`,
  );
  const highRelevance = results.filter((r) => r.feedback.content.relevance >= 0.8).length;
  if (highRelevance >= Math.ceil(results.length / 2)) strengths.push("Answers stayed on topic for most questions.");

  const missing = Array.from(new Set(results.flatMap((r) => r.feedback.content.missing_concepts)));
  const areas = [
    `${weakest.question.topic}: the least complete answer. It left out ${weakest.feedback.content.missing_concepts[0] ?? "part of the core idea"}.`,
    ...missing.slice(0, 2).map((c) => `Prepare a short point on "${c}" for questions on this topic.`),
  ];

  const paces = results
    .map((r) => r.feedback.delivery.find((d) => d.signal === "speaking_pace")?.value)
    .filter((v): v is number => typeof v === "number");
  const pauses = results
    .map((r) => r.feedback.delivery.find((d) => d.signal === "long_pauses")?.value)
    .filter((v): v is number => typeof v === "number");
  const patterns: string[] = [];
  if (paces.length) patterns.push(`Average speaking pace was about ${Math.round(paces.reduce((a, b) => a + b, 0) / paces.length)} words per minute.`);
  if (pauses.length) patterns.push(`${pauses.reduce((a, b) => a + b, 0)} pauses longer than 3 seconds across ${results.length} answers.`);

  return { session_id: sessionId, strengths, areas_to_improve: areas, patterns };
}
