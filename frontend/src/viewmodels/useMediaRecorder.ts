import { useCallback, useRef, useState } from "react";
import { createRecorder, openStream, stopStream } from "../services/mediaService";

/** ViewModel for capturing one answer from camera and mic. */
export function useMediaRecorder(withVideo: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    const s = stream ?? (await openStream(withVideo));
    setStream(s);
    chunks.current = [];
    recorder.current = createRecorder(s);
    recorder.current.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.current.start();
    setIsRecording(true);
  }, [stream, withVideo]);

  const stop = useCallback(
    () =>
      new Promise<Blob>((resolve) => {
        const r = recorder.current;
        if (!r) return resolve(new Blob());
        r.onstop = () => resolve(new Blob(chunks.current, { type: "video/webm" }));
        r.stop();
        setIsRecording(false);
      }),
    [],
  );

  const release = useCallback(() => {
    stopStream(stream);
    setStream(null);
  }, [stream]);

  return { stream, isRecording, start, stop, release };
}
