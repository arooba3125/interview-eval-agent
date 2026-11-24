import type { TextEmotionResult } from "../domain/types";
import { ApiError } from "./apiClient";
import { API_BASE_URL } from "./config";

/** Same limit as the backend's TextEmotionRequest schema. */
export const MAX_TRANSCRIPT_CHARS = 20_000;

const UNREACHABLE = "Could not reach the backend for text emotion analysis. Check that it is running on port 8000.";

async function readDetail(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((d) => (d && typeof d === "object" && "msg" in d ? String(d.msg) : "")).join(" ").trim() || null;
    }
  } catch {
    /* no JSON body */
  }
  return null;
}

/**
 * Live call to the backend's experimental text emotion model. It runs in mock mode too:
 * it is the only real model output in the app, and it is never stored with mock history.
 */
export async function analyzeTextEmotion(transcript: string, signal?: AbortSignal): Promise<TextEmotionResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/analysis/text-emotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(UNREACHABLE);
  }
  if (!res.ok) {
    const detail = await readDetail(res);
    if (res.status === 422) throw new ApiError(detail ?? "The transcript could not be analysed.", 422);
    if (res.status === 503) throw new ApiError(detail ?? "The text emotion model is not available.", 503);
    // The dev proxy answers 5xx without a FastAPI body when the backend is down.
    if (res.status >= 500 && !detail) throw new ApiError(UNREACHABLE, res.status);
    throw new ApiError(detail ?? `The server returned ${res.status} ${res.statusText}.`, res.status);
  }
  return (await res.json()) as TextEmotionResult;
}
