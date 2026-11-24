import { useCallback, useEffect, useRef, useState } from "react";
import { interviewApi } from "../services/interviewApi";
import { historyStore } from "../services/historyStore";
import type { Question, SessionRecord } from "../domain/types";
import { useTextEmotion } from "./useTextEmotion";
import { useTranscription } from "./useTranscription";

/** "saving": the answer is being recorded as answered (no analysis is simulated). */
export type Phase = "loading" | "answering" | "saving" | "feedback" | "done" | "error";

/**
 * ViewModel for the interview loop: question -> record -> transcribe/measure -> review ->
 * submit -> live feedback -> next. Every result shown comes from a live model.
 */
export function useInterviewSession(sessionId: string) {
  const [record] = useState<SessionRecord | null>(() => historyStore.get(sessionId));
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<Question | null>(null);
  /** The question whose answer was just saved; live results that arrive later are added to it. */
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(record?.results.length ?? 0);
  // Transcript of the current take: filled by speech-to-text, then reviewed and edited by the
  // candidate before submitting. Sent to the experimental text emotion analysis; the text itself
  // is never stored.
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const textEmotion = useTextEmotion();
  const transcription = useTranscription(setTranscriptDraft);
  const { transcribe, reset: resetTranscription } = transcription;

  /** A new take was recorded: transcribe it locally so the candidate can review the text. */
  const transcribeTake = useCallback(
    (recording: Blob) => {
      setTranscriptDraft("");
      void transcribe(recording);
    },
    [transcribe],
  );

  /** The take was thrown away: drop its transcript too. */
  const clearTake = useCallback(() => {
    resetTranscription();
    setTranscriptDraft("");
  }, [resetTranscription]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const { analyze: analyzeTextEmotion, reset: resetTextEmotion } = textEmotion;

  const loadNext = useCallback(async () => {
    setSavedQuestionId(null);
    setSubmitError(null);
    setLoadError(null);
    setTranscriptDraft("");
    resetTextEmotion();
    resetTranscription();
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
  }, [sessionId, resetTextEmotion, resetTranscription]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  // The text emotion result arrives after the answer is saved: keep it with that answer for the report.
  useEffect(() => {
    if (!savedQuestionId) return;
    if (textEmotion.status === "success" && textEmotion.result) {
      historyStore.updateResult(sessionId, savedQuestionId, { text_emotion: textEmotion.result });
    } else if (textEmotion.status === "error" || textEmotion.status === "skipped") {
      historyStore.updateResult(sessionId, savedQuestionId, { text_emotion: null });
    }
  }, [sessionId, savedQuestionId, textEmotion.status, textEmotion.result]);

  const submit = useCallback(
    async (recording: Blob, durationS: number) => {
      if (!question) return;
      setSubmitError(null);
      setPhase("saving");
      // Live model on the reviewed transcript; shown in the feedback with its own loading state.
      void analyzeTextEmotion(transcriptDraft);
      // Measured from the actual recording during transcription; null when it was unavailable.
      const measured = transcription.status === "success" ? (transcription.result?.delivery ?? null) : null;
      try {
        await interviewApi.submitAnswer(sessionId, question.id, recording);
        if (!alive.current) return;
        historyStore.appendResult(sessionId, {
          question,
          answer_duration_s: durationS,
          answered_at: new Date().toISOString(),
          measured_delivery: measured,
        });
        setAnsweredCount((n) => Math.max(n, question.index));
        setSavedQuestionId(question.id);
        setPhase("feedback");
      } catch (e) {
        if (!alive.current) return;
        resetTextEmotion();
        setSubmitError(e instanceof Error ? e.message : "The answer could not be saved.");
        setPhase("answering");
      }
    },
    [sessionId, question, transcriptDraft, analyzeTextEmotion, resetTextEmotion, transcription.status, transcription.result],
  );

  const finishEarly = useCallback(() => historyStore.complete(sessionId), [sessionId]);

  const isLastQuestion = !!question && question.index >= question.total;

  return {
    record, phase, question, loadError, submitError, answeredCount, isLastQuestion,
    transcriptDraft, setTranscriptDraft, textEmotion, transcription, transcribeTake, clearTake,
    submit, loadNext, finishEarly,
  };
}
