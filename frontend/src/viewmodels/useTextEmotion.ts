import { useCallback, useEffect, useRef, useState } from "react";
import type { TextEmotionResult } from "../domain/types";
import { analyzeTextEmotion } from "../services/textEmotionApi";

/** "skipped": the answer was submitted without a transcript, so nothing was sent. */
export type TextEmotionStatus = "idle" | "skipped" | "loading" | "success" | "error";

export interface TextEmotionState {
  status: TextEmotionStatus;
  result: TextEmotionResult | null;
  error: string | null;
  /** The text that was (or is being) analysed. */
  transcript: string;
}

const IDLE: TextEmotionState = { status: "idle", result: null, error: null, transcript: "" };

/**
 * ViewModel for the experimental text emotion analysis of one answer. Results live in
 * memory here; the interview viewmodel saves the result (not the transcript) with the answer.
 */
export function useTextEmotion() {
  const [state, setState] = useState<TextEmotionState>(IDLE);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const analyze = useCallback(async (transcript: string) => {
    controller.current?.abort();
    const text = transcript.trim();
    if (!text) {
      setState({ ...IDLE, status: "skipped" });
      return;
    }
    const c = new AbortController();
    controller.current = c;
    setState({ status: "loading", result: null, error: null, transcript: text });
    try {
      const result = await analyzeTextEmotion(text, c.signal);
      if (!c.signal.aborted) setState({ status: "success", result, error: null, transcript: text });
    } catch (e) {
      if (c.signal.aborted) return;
      setState({
        status: "error",
        result: null,
        error: e instanceof Error ? e.message : "Text emotion analysis failed.",
        transcript: text,
      });
    }
  }, []);

  const retry = useCallback(() => void analyze(state.transcript), [analyze, state.transcript]);

  const reset = useCallback(() => {
    controller.current?.abort();
    setState(IDLE);
  }, []);

  return { ...state, analyze, retry, reset };
}

export type TextEmotionViewModel = ReturnType<typeof useTextEmotion>;
