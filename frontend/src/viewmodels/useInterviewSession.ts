import { useCallback, useEffect, useState } from "react";
import { api } from "../services/apiClient";
import type { AnswerFeedback, Question } from "../domain/types";

type Phase = "loading" | "ready" | "recording" | "analyzing" | "feedback" | "done";

/** ViewModel for the interview loop: question -> record -> analyse -> feedback -> next. */
export function useInterviewSession(sessionId: string) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNext = useCallback(async () => {
    setFeedback(null);
    setPhase("loading");
    try {
      const q = await api.nextQuestion(sessionId);
      setQuestion(q);
      setPhase(q ? "ready" : "done");
    } catch (e) {
      setError(String(e));
    }
  }, [sessionId]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const submit = useCallback(
    async (recording: Blob) => {
      if (!question) return;
      setPhase("analyzing");
      try {
        setFeedback(await api.submitAnswer(sessionId, question.id, recording));
        setPhase("feedback");
      } catch (e) {
        setError(String(e));
      }
    },
    [sessionId, question],
  );

  return { phase, setPhase, question, feedback, error, submit, loadNext };
}
