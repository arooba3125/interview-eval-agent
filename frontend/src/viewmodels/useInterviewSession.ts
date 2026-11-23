import { useCallback, useEffect, useRef, useState } from "react";
import { interviewApi } from "../services/interviewApi";
import { historyStore } from "../services/historyStore";
import type { AnswerFeedback, Question, SessionRecord } from "../domain/types";

export type Phase = "loading" | "answering" | "analyzing" | "feedback" | "done" | "error";

export const ANALYSIS_STAGES = [
  "Uploading your answer",
  "Transcribing speech",
  "Scoring relevance and completeness",
  "Measuring pace, pauses and volume",
] as const;

/** ViewModel for the interview loop: question -> record -> analyse -> feedback -> next. */
export function useInterviewSession(sessionId: string) {
  const [record] = useState<SessionRecord | null>(() => historyStore.get(sessionId));
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(record?.results.length ?? 0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadNext = useCallback(async () => {
    setFeedback(null);
    setSubmitError(null);
    setLoadError(null);
    setPhase("loading");
    try {
      const q = await interviewApi.nextQuestion(sessionId);
      if (!alive.current) return;
      setQuestion(q);
      if (!q) historyStore.complete(sessionId);
      setPhase(q ? "answering" : "done");
    } catch (e) {
      if (!alive.current) return;
      setLoadError(e instanceof Error ? e.message : "Could not load the next question.");
      setPhase("error");
    }
  }, [sessionId]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  // Step through the analysis messages while waiting.
  useEffect(() => {
    if (phase !== "analyzing") return;
    setStage(0);
    const t = window.setInterval(() => setStage((s) => Math.min(s + 1, ANALYSIS_STAGES.length - 1)), 650);
    return () => window.clearInterval(t);
  }, [phase]);

  const submit = useCallback(
    async (recording: Blob, durationS: number) => {
      if (!question) return;
      setSubmitError(null);
      setPhase("analyzing");
      try {
        const fb = await interviewApi.submitAnswer(sessionId, question.id, recording);
        if (!alive.current) return;
        historyStore.appendResult(sessionId, {
          question,
          feedback: fb,
          answer_duration_s: durationS,
          answered_at: new Date().toISOString(),
        });
        setAnsweredCount((n) => Math.max(n, question.index));
        setFeedback(fb);
        setPhase("feedback");
      } catch (e) {
        if (!alive.current) return;
        setSubmitError(e instanceof Error ? e.message : "The answer could not be analysed.");
        setPhase("answering");
      }
    },
    [sessionId, question],
  );

  const finishEarly = useCallback(() => historyStore.complete(sessionId), [sessionId]);

  const isLastQuestion = !!question && question.index >= question.total;

  return {
    record, phase, question, feedback, loadError, submitError, stage, answeredCount, isLastQuestion,
    submit, loadNext, finishEarly,
  };
}
