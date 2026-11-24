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

export async function openStream(opts: { audio: boolean; video: boolean }): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new MediaAccessError("insecure", "Camera and microphone need a secure page (https or localhost).");
  }
  if (!isMediaSupported()) {
    throw new MediaAccessError("unsupported", "This browser cannot record audio. Try a recent Chrome, Edge, Firefox or Safari.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: opts.audio ? { echoCancellation: true, noiseSuppression: true } : false,
      video: opts.video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
    });
  } catch (e) {
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
