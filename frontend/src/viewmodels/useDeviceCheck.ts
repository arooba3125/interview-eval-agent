import { useCallback, useEffect, useRef, useState } from "react";
import type { InterviewConfig } from "../domain/types";
import { interviewApi } from "../services/interviewApi";
import { historyStore } from "../services/historyStore";
import { setupDraft } from "../services/setupDraft";
import { MediaAccessError, createRecorder, openStream, startLevelMeter, stopStream, type MediaErrorKind } from "../services/mediaService";

export type DeviceStatus = "idle" | "checking" | "ready" | "blocked" | "error";

export interface DeviceState {
  status: DeviceStatus;
  message: string | null;
  errorKind: MediaErrorKind | null;
}

const IDLE: DeviceState = { status: "idle", message: null, errorKind: null };
const TEST_CLIP_SECONDS = 4;

function failure(e: unknown): DeviceState {
  if (e instanceof MediaAccessError) {
    return { status: e.kind === "denied" ? "blocked" : "error", message: e.message, errorKind: e.kind };
  }
  return { status: "error", message: "Something went wrong opening the device.", errorKind: "unknown" };
}

/** ViewModel for the device check and consent step. */
export function useDeviceCheck(config: InterviewConfig | null) {
  const [mic, setMic] = useState<DeviceState>(IDLE);
  const [camera, setCamera] = useState<DeviceState>(IDLE);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const [heardSound, setHeardSound] = useState(false);

  const [useCamera, setUseCamera] = useState(true);
  const [consentAudio, setConsentAudio] = useState(false);
  const [consentVideo, setConsentVideo] = useState(false);

  const [testClip, setTestClip] = useState<{ status: "idle" | "recording" | "ready"; url: string | null; secondsLeft: number }>({
    status: "idle",
    url: null,
    secondsLeft: TEST_CLIP_SECONDS,
  });

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [attemptedStart, setAttemptedStart] = useState(false);

  // Keep latest streams in refs so cleanup on unmount releases them.
  const streams = useRef<{ mic: MediaStream | null; cam: MediaStream | null }>({ mic: null, cam: null });
  streams.current = { mic: micStream, cam: cameraStream };
  useEffect(() => () => {
    stopStream(streams.current.mic);
    stopStream(streams.current.cam);
  }, []);

  useEffect(() => {
    if (!micStream) return;
    return startLevelMeter(micStream, (l) => {
      setLevel(l);
      if (l > 0.08) setHeardSound(true);
    });
  }, [micStream]);

  useEffect(() => () => {
    if (testClip.url) URL.revokeObjectURL(testClip.url);
  }, [testClip.url]);

  const checkMic = useCallback(async () => {
    setMic({ status: "checking", message: null, errorKind: null });
    try {
      stopStream(streams.current.mic);
      const s = await openStream({ audio: true, video: false });
      setMicStream(s);
      setMic({ status: "ready", message: null, errorKind: null });
    } catch (e) {
      setMicStream(null);
      setMic(failure(e));
    }
  }, []);

  const checkCamera = useCallback(async () => {
    setCamera({ status: "checking", message: null, errorKind: null });
    try {
      stopStream(streams.current.cam);
      const s = await openStream({ audio: false, video: true });
      setCameraStream(s);
      setCamera({ status: "ready", message: null, errorKind: null });
    } catch (e) {
      setCameraStream(null);
      setCamera(failure(e));
    }
  }, []);

  const toggleCamera = useCallback((on: boolean) => {
    setUseCamera(on);
    if (!on) {
      stopStream(streams.current.cam);
      setCameraStream(null);
      setCamera(IDLE);
      setConsentVideo(false);
    }
  }, []);

  const recordTestClip = useCallback(() => {
    const s = streams.current.mic;
    if (!s) return;
    const rec = createRecorder(s);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      setTestClip({ status: "ready", url, secondsLeft: TEST_CLIP_SECONDS });
    };
    rec.start();
    setTestClip((t) => ({ status: "recording", url: t.url, secondsLeft: TEST_CLIP_SECONDS }));
    let left = TEST_CLIP_SECONDS;
    const timer = window.setInterval(() => {
      left -= 1;
      setTestClip((t) => ({ ...t, secondsLeft: left }));
      if (left <= 0) {
        window.clearInterval(timer);
        if (rec.state !== "inactive") rec.stop();
      }
    }, 1000);
  }, []);

  const blockers: string[] = [];
  if (mic.status !== "ready") blockers.push("Test your microphone. Answers are recorded with it.");
  if (useCamera && camera.status !== "ready") blockers.push("Test your camera, or turn the camera off.");
  if (!consentAudio) blockers.push("Agree to the recording and analysis of your spoken answers.");

  const start = useCallback(async (): Promise<string | null> => {
    setAttemptedStart(true);
    if (!config || blockers.length > 0) return null;
    setStarting(true);
    setStartError(null);
    try {
      const session = await interviewApi.createSession({
        ...config,
        consent_audio_analysis: consentAudio,
        consent_video_analysis: useCamera && consentVideo,
      });
      historyStore.save({
        session,
        camera_enabled: useCamera,
        started_at: new Date().toISOString(),
        completed_at: null,
        results: [],
        is_sample: false,
      });
      setupDraft.clear();
      // Release test streams; the interview room opens its own.
      stopStream(streams.current.mic);
      stopStream(streams.current.cam);
      return session.id;
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Could not start the interview.");
      return null;
    } finally {
      setStarting(false);
    }
  }, [config, blockers.length, consentAudio, consentVideo, useCamera]);

  return {
    mic, camera, micStream, cameraStream, level, heardSound,
    useCamera, toggleCamera, consentAudio, setConsentAudio, consentVideo, setConsentVideo,
    checkMic, checkCamera, testClip, recordTestClip,
    blockers, attemptedStart, starting, startError, start,
  };
}
