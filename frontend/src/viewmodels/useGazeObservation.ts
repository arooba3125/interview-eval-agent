import { useCallback, useEffect, useRef, useState } from "react";
import type { GazeDirection, GazeResult } from "../domain/types";
import { estimateGaze } from "../services/gazeApi";
import { FrameGrabber } from "../services/mediaService";

/** One sample = this many frames, taken this far apart, every SAMPLE_EVERY_MS while recording. */
const FRAMES_PER_SAMPLE = 3;
const FRAME_GAP_MS = 400;
const SAMPLE_EVERY_MS = 3000;

/**
 * - off: the camera is off for this interview
 * - no-consent: camera on, but the candidate did not opt in to camera cues
 * - unavailable: camera cues allowed, but no camera picture (blocked, missing or failed)
 * - waiting: ready; sampling starts when recording starts
 * - loading: first request in flight (the model loads on first use)
 * - live: at least one estimate received for this take
 * - error: the last request failed; sampling paused until retry
 */
export type GazeStatus = "off" | "no-consent" | "unavailable" | "waiting" | "loading" | "live" | "error";

export type GazeTally = Record<GazeDirection | "no_face", number>;

const EMPTY_TALLY: GazeTally = { toward_screen: 0, left: 0, right: 0, up: 0, down: 0, no_face: 0 };

export interface GazeState {
  status: GazeStatus;
  latest: GazeResult | null;
  /** Samples of the current take by direction. In memory only; never stored or uploaded. */
  tally: GazeTally;
  samples: number;
  error: string | null;
}

interface Options {
  cameraOn: boolean;
  consent: boolean;
  stream: MediaStream | null;
  /** The camera could not be opened (permission blocked, missing device...). */
  cameraError: boolean;
  recording: boolean;
}

/**
 * ViewModel for the approximate gaze observation. While a take is recording, it grabs a few
 * small frames every few seconds, sends them to the local backend and keeps only the result.
 */
export function useGazeObservation({ cameraOn, consent, stream, cameraError, recording }: Options) {
  const [latest, setLatest] = useState<GazeResult | null>(null);
  const [tally, setTally] = useState<GazeTally>(EMPTY_TALLY);
  const [samples, setSamples] = useState(0);
  const [requestState, setRequestState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const failed = useRef(false);

  const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.readyState === "live");
  const allowed = cameraOn && consent && hasVideo && !cameraError;

  // A new take starts a new tally.
  useEffect(() => {
    if (!recording) return;
    setTally(EMPTY_TALLY);
    setSamples(0);
    setLatest(null);
  }, [recording]);

  useEffect(() => {
    if (!allowed || !recording || !stream || failed.current) return;
    const grabber = new FrameGrabber(stream);
    const controller = new AbortController();
    let busy = false;
    let timer = 0;

    const sample = async () => {
      if (busy) return;
      busy = true;
      try {
        const frames: Blob[] = [];
        for (let i = 0; i < FRAMES_PER_SAMPLE && !controller.signal.aborted; i++) {
          if (i) await new Promise((r) => window.setTimeout(r, FRAME_GAP_MS));
          const f = await grabber.grab();
          if (f) frames.push(f);
        }
        if (controller.signal.aborted || frames.length === 0) return;
        setRequestState((s) => (s === "idle" ? "loading" : s));
        const result = await estimateGaze(frames, controller.signal);
        frames.length = 0; // drop the frames; only the estimate is kept
        if (controller.signal.aborted) return;
        setLatest(result);
        setSamples((n) => n + 1);
        setTally((t) => {
          const key = result.direction ?? "no_face";
          return { ...t, [key]: t[key] + 1 };
        });
        setRequestState("idle");
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        failed.current = true;
        setRequestState("error");
        setError(e instanceof Error ? e.message : "Gaze estimation failed.");
        window.clearInterval(timer);
      } finally {
        busy = false;
      }
    };

    void sample();
    timer = window.setInterval(() => void sample(), SAMPLE_EVERY_MS);
    return () => {
      window.clearInterval(timer);
      controller.abort();
      grabber.close();
    };
  }, [allowed, recording, stream, retryKey]);

  const retry = useCallback(() => {
    failed.current = false;
    setError(null);
    setRequestState("idle");
    setRetryKey((k) => k + 1);
  }, []);

  let status: GazeStatus;
  if (!cameraOn) status = "off";
  else if (!consent) status = "no-consent";
  else if (cameraError || (stream && !hasVideo)) status = "unavailable";
  else if (requestState === "error") status = "error";
  else if (latest || samples > 0) status = "live";
  else if (requestState === "loading" || (recording && hasVideo)) status = "loading";
  else status = "waiting";

  const state: GazeState = { status, latest, tally, samples, error };
  return { ...state, retry };
}

export type GazeViewModel = ReturnType<typeof useGazeObservation>;
