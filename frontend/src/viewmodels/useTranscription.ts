import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptionResult } from "../domain/types";
import { transcribeRecording } from "../services/transcriptionApi";

export type TranscriptionStatus = "idle" | "loading" | "success" | "error";

export interface TranscriptionState {
  status: TranscriptionStatus;
  result: TranscriptionResult | null;
  error: string | null;
}

const IDLE: TranscriptionState = { status: "idle", result: null, error: null };

/**
 * ViewModel for speech-to-text of one recorded take. `onText` receives the transcript so the
 * candidate can review and edit it. Results live in memory only.
 */
export function useTranscription(onText: (text: string) => void) {
  const [state, setState] = useState<TranscriptionState>(IDLE);
  const controller = useRef<AbortController | null>(null);
  const lastBlob = useRef<Blob | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => controller.current?.abort(), []);

  const transcribe = useCallback(async (recording: Blob) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    lastBlob.current = recording;
    setState({ status: "loading", result: null, error: null });
    try {
      const result = await transcribeRecording(recording, c.signal);
      if (c.signal.aborted) return;
      setState({ status: "success", result, error: null });
      onTextRef.current(result.transcript);
    } catch (e) {
      if (c.signal.aborted) return;
      setState({ status: "error", result: null, error: e instanceof Error ? e.message : "Transcription failed." });
    }
  }, []);

  const retry = useCallback(() => {
    if (lastBlob.current) void transcribe(lastBlob.current);
  }, [transcribe]);

  const reset = useCallback(() => {
    controller.current?.abort();
    lastBlob.current = null;
    setState(IDLE);
  }, []);

  return { ...state, transcribe, retry, reset };
}

export type TranscriptionViewModel = ReturnType<typeof useTranscription>;
