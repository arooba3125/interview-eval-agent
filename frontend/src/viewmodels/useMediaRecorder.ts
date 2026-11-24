import { useCallback, useEffect, useRef, useState } from "react";
import { MediaAccessError, createRecorder, micPreference, openStream, startLevelMeter, stopStream } from "../services/mediaService";

export type RecorderStatus = "idle" | "opening" | "live" | "recording" | "recorded" | "error";

export interface Recording {
  blob: Blob;
  url: string;
  durationS: number;
  /**
   * True when the microphone delivered no sound for the whole take (or no data at all),
   * e.g. Windows blocking desktop apps from the microphone, or a muted/wrong input.
   */
  silent: boolean;
}

/** Below this meter level (0..1) for the whole take, the recording is treated as silent. */
const SILENCE_PEAK = 0.02;
/** Meter readings (~15 per second) needed before judging silence, so very short takes are not flagged. */
const MIN_READINGS = 10;

/** ViewModel for capturing one answer from mic (and camera): record, stop, replay, discard. */
export function useMediaRecorder(opts: { video: boolean; maxSeconds: number }) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;

  // Loudness seen during the current take.
  const isRecording = useRef(false);
  const peak = useRef(0);
  const readings = useRef(0);

  const opening = useRef<Promise<MediaStream | null> | null>(null);
  const released = useRef(false);

  // Live input level while the microphone is open.
  useEffect(() => {
    if (!stream) return;
    const stopMeter = startLevelMeter(stream, (l) => {
      setLevel(l);
      if (isRecording.current) {
        readings.current += 1;
        peak.current = Math.max(peak.current, l);
      }
    });
    return () => {
      stopMeter();
      setLevel(0);
    };
  }, [stream]);

  const open = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current) return streamRef.current;
    // Share one request if open() is called again while the permission prompt is up.
    released.current = false;
    if (opening.current) return opening.current;
    setStatus("opening");
    setError(null);
    opening.current = openStream({ audio: true, video: opts.video, micId: micPreference.get() })
      .then((s) => {
        if (released.current) {
          stopStream(s);
          return null;
        }
        streamRef.current = s;
        setStream(s);
        setStatus("live");
        return s;
      })
      .catch((e) => {
        setError(e instanceof MediaAccessError ? e.message : "Could not open the microphone.");
        setStatus("error");
        return null;
      })
      .finally(() => {
        opening.current = null;
      });
    return opening.current;
  }, [opts.video]);

  const stop = useCallback(() => {
    const r = recorder.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const start = useCallback(async () => {
    const s = streamRef.current ?? (await open());
    if (!s) return;
    setRecording((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    chunks.current = [];
    peak.current = 0;
    readings.current = 0;
    const r = createRecorder(s);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      isRecording.current = false;
      const blob = new Blob(chunks.current, { type: r.mimeType || "video/webm" });
      const durationS = (performance.now() - startedAt.current) / 1000;
      const silent = blob.size === 0 || (readings.current >= MIN_READINGS && peak.current < SILENCE_PEAK);
      setRecording({ blob, url: URL.createObjectURL(blob), durationS, silent });
      setStatus("recorded");
    };
    recorder.current = r;
    startedAt.current = performance.now();
    setElapsed(0);
    isRecording.current = true;
    r.start(1000);
    setStatus("recording");
  }, [open]);

  // Timer and auto-stop at the limit.
  useEffect(() => {
    if (status !== "recording") return;
    const t = window.setInterval(() => {
      const s = (performance.now() - startedAt.current) / 1000;
      setElapsed(s);
      if (s >= opts.maxSeconds) stop();
    }, 250);
    return () => window.clearInterval(t);
  }, [status, opts.maxSeconds, stop]);

  /** Throw away the take so the candidate can record again. */
  const discard = useCallback(() => {
    setRecording((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setElapsed(0);
    setStatus(streamRef.current ? "live" : "idle");
  }, []);

  const release = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    isRecording.current = false;
    released.current = true;
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => () => release(), [release]);

  return { status, stream, elapsed, recording, error, level, open, start, stop, discard, release };
}
