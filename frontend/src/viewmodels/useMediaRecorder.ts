import { useCallback, useEffect, useRef, useState } from "react";
import { MediaAccessError, createRecorder, openStream, stopStream } from "../services/mediaService";

export type RecorderStatus = "idle" | "opening" | "live" | "recording" | "recorded" | "error";

export interface Recording {
  blob: Blob;
  url: string;
  durationS: number;
}

/** ViewModel for capturing one answer from mic (and camera): record, stop, replay, discard. */
export function useMediaRecorder(opts: { video: boolean; maxSeconds: number }) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;

  const opening = useRef<Promise<MediaStream | null> | null>(null);
  const released = useRef(false);

  const open = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current) return streamRef.current;
    // Share one request if open() is called again while the permission prompt is up.
    released.current = false;
    if (opening.current) return opening.current;
    setStatus("opening");
    setError(null);
    opening.current = openStream({ audio: true, video: opts.video })
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
    const r = createRecorder(s);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const blob = new Blob(chunks.current, { type: r.mimeType || "video/webm" });
      const durationS = (performance.now() - startedAt.current) / 1000;
      setRecording({ blob, url: URL.createObjectURL(blob), durationS });
      setStatus("recorded");
    };
    recorder.current = r;
    startedAt.current = performance.now();
    setElapsed(0);
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
    released.current = true;
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => () => release(), [release]);

  return { status, stream, elapsed, recording, error, open, start, stop, discard, release };
}
