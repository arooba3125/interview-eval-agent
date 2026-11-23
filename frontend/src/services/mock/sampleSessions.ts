// SAMPLE past sessions shown on the Previous sessions page in demo mode.

import type { QuestionResult, SessionRecord } from "../../domain/types";
import { generateFeedback } from "./mockFeedback";
import { pickQuestions } from "./questionBank";

function sample(
  id: string,
  role: string,
  level: SessionRecord["session"]["experience_level"],
  type: string,
  startedAt: string,
  camera: boolean,
): SessionRecord {
  const questions = pickQuestions(role, type);
  const start = new Date(startedAt).getTime();
  const results: QuestionResult[] = questions.map((q, i) => {
    const qid = `${id}-q${i + 1}`;
    return {
      question: { id: qid, text: q.text, topic: q.topic, index: i + 1, total: questions.length },
      feedback: generateFeedback(qid, q, { seed: qid, withCameraCues: camera, behavioural: q.kind === "behavioural" }),
      answer_duration_s: 70 + ((i * 37) % 60),
      answered_at: new Date(start + (i + 1) * 4 * 60_000).toISOString(),
    };
  });
  return {
    session: { id, job_role: role, experience_level: level, interview_type: type, consent_video_analysis: camera },
    camera_enabled: camera,
    started_at: startedAt,
    completed_at: new Date(start + 20 * 60_000).toISOString(),
    results,
    is_sample: true,
  };
}

export const SAMPLE_SESSIONS: SessionRecord[] = [
  sample("sample-ml-1", "Machine Learning Engineer", "junior", "technical", "2026-11-20T15:10:00.000Z", true),
  sample("sample-swe-1", "Software Engineer", "junior", "mixed", "2026-11-17T10:30:00.000Z", false),
  sample("sample-ds-1", "Data Scientist", "intern", "behavioural", "2026-11-12T13:45:00.000Z", false),
];
