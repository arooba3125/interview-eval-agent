import type { TranscriptionResult } from "../domain/types";
import { ApiError } from "./apiClient";
import { API_BASE_URL } from "./config";
import { readDetail } from "./textEmotionApi";

const UNREACHABLE = "Could not reach the backend for speech-to-text. Check that it is running on port 8000.";

function fileNameFor(blob: Blob): string {
  if (blob.type.includes("mp4")) return "answer.mp4";
  if (blob.type.includes("ogg")) return "answer.ogg";
  return "answer.webm";
}

/**
 * Sends the existing answer recording to the backend's local Whisper model. Like the text
 * emotion call, it always runs live; the transcript text is never stored in the history.
 */
export async function transcribeRecording(recording: Blob, signal?: AbortSignal): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("audio", recording, fileNameFor(recording));
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/analysis/transcribe`, { method: "POST", body: form, signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(UNREACHABLE);
  }
  if (!res.ok) {
    const detail = await readDetail(res);
    if (res.status === 413) throw new ApiError(detail ?? "The recording is too large to transcribe.", 413);
    if (res.status === 422) throw new ApiError(detail ?? "The recording could not be read as audio.", 422);
    if (res.status === 503) throw new ApiError(detail ?? "The speech-to-text model is not available.", 503);
    if (res.status >= 500 && !detail) throw new ApiError(UNREACHABLE, res.status);
    throw new ApiError(detail ?? `The server returned ${res.status} ${res.statusText}.`, res.status);
  }
  return (await res.json()) as TranscriptionResult;
}
