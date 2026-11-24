// Browser camera/microphone access. Plain functions, no React.

export type MediaErrorKind = "denied" | "not-found" | "in-use" | "insecure" | "unsupported" | "unknown";

export class MediaAccessError extends Error {
  constructor(
    readonly kind: MediaErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "MediaAccessError";
  }
}

export function isMediaSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

function toMediaError(e: unknown): MediaAccessError {
  const name = e instanceof DOMException ? e.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new MediaAccessError("denied", "Permission was blocked. Allow access in your browser's site settings, then try again.");
    case "NotFoundError":
    case "OverconstrainedError":
      return new MediaAccessError("not-found", "No matching device was found. Connect one and try again.");
    case "NotReadableError":
    case "AbortError":
      return new MediaAccessError("in-use", "The device is busy. Close other apps that may be using it, then try again.");
    default:
      return new MediaAccessError("unknown", "The device could not be opened. Try again or use another browser.");
  }
}

const MIC_KEY = "iea.microphoneId";

/** The microphone the candidate picked on the device check page (kept on this device only). */
export const micPreference = {
  get(): string | null {
    try {
      return localStorage.getItem(MIC_KEY);
    } catch {
      return null;
    }
  },
  set(id: string | null): void {
    try {
      if (id) localStorage.setItem(MIC_KEY, id);
      else localStorage.removeItem(MIC_KEY);
    } catch {
      /* storage unavailable: the choice lasts for this page only */
    }
  },
};

export interface MicOption {
  id: string;
  label: string;
}

/** Audio inputs the browser can see. Labels are only filled in once permission is granted. */
export async function listMicrophones(): Promise<MicOption[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === "audioinput" && d.deviceId)
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
}

export async function openStream(opts: { audio: boolean; video: boolean; micId?: string | null }): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new MediaAccessError("insecure", "Camera and microphone need a secure page (https or localhost).");
  }
  if (!isMediaSupported()) {
    throw new MediaAccessError("unsupported", "This browser cannot record audio. Try a recent Chrome, Edge, Firefox or Safari.");
  }
  // Automatic gain control is off so the recording keeps real loudness changes, which the
  // relative-volume delivery measurement compares (AGC would flatten them).
  const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: false };
  if (opts.micId) audio.deviceId = { exact: opts.micId };
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: opts.audio ? audio : false,
      video: opts.video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
    });
  } catch (e) {
    // A saved microphone that is no longer plugged in: forget it and fall back to the default.
    const name = e instanceof DOMException ? e.name : "";
    if (opts.micId && (name === "OverconstrainedError" || name === "NotFoundError")) {
      micPreference.set(null);
      return openStream({ ...opts, micId: null });
    }
    throw toMediaError(e);
  }
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** First container the browser can record. Safari records mp4, others webm. */
export function pickMimeType(hasVideo: boolean): string | undefined {
  const candidates = hasVideo
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t));
}

export function createRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = pickMimeType(stream.getVideoTracks().length > 0);
  return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
}

/**
 * Grabs still frames from a stream's camera track as small JPEGs, using an off-screen video
 * element. Frames exist only in memory until the caller drops them.
 */
export class FrameGrabber {
  private video: HTMLVideoElement;
  private canvas = document.createElement("canvas");
  private ready: Promise<void>;

  constructor(stream: MediaStream, private maxWidth = 640) {
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.srcObject = new MediaStream(stream.getVideoTracks());
    this.ready = this.video.play().then(() => undefined);
  }

  async grab(quality = 0.8): Promise<Blob | null> {
    await this.ready;
    const { videoWidth: w, videoHeight: h } = this.video;
    if (!w || !h) return null;
    const scale = Math.min(1, this.maxWidth / w);
    this.canvas.width = Math.round(w * scale);
    this.canvas.height = Math.round(h * scale);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    return new Promise((resolve) => this.canvas.toBlob(resolve, "image/jpeg", quality));
  }

  close(): void {
    this.video.pause();
    this.video.srcObject = null;
    this.canvas.width = 0;
  }
}

/**
 * Calls `onLevel` about 15 times a second with the input loudness (0..1).
 * Returns a function that stops the meter.
 */
export function startLevelMeter(stream: MediaStream, onLevel: (level: number) => void): () => void {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx || stream.getAudioTracks().length === 0) return () => {};
  const ctx = new AudioCtx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  const timer = window.setInterval(() => {
    // An AudioContext created before any click starts "suspended" and reads as silence.
    // Resume it (allowed once the user has interacted) and only report real readings.
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {});
      return;
    }
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += ((v - 128) / 128) ** 2;
    onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
  }, 66);
  return () => {
    window.clearInterval(timer);
    void ctx.close();
  };
}
