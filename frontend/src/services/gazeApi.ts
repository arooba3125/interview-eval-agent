import type { GazeResult } from "../domain/types";
import { ApiError } from "./apiClient";
import { API_BASE_URL } from "./config";
import { readDetail } from "./textEmotionApi";

const UNREACHABLE = "Could not reach the backend for gaze estimation. Check that it is running on port 8000.";

/**
 * Sends a few camera frames to the backend's local gaze model. Frames are analysed in memory
 * and discarded; only the direction estimate comes back. Never stored.
 */
export async function estimateGaze(frames: Blob[], signal?: AbortSignal): Promise<GazeResult> {
  const form = new FormData();
  frames.forEach((f, i) => form.append("frames", f, `frame-${i}.jpg`));
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/analysis/gaze`, { method: "POST", body: form, signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(UNREACHABLE);
  }
  if (!res.ok) {
    const detail = await readDetail(res);
    if (res.status === 503) throw new ApiError(detail ?? "The gaze model is not available.", 503);
    if (res.status >= 500 && !detail) throw new ApiError(UNREACHABLE, res.status);
    throw new ApiError(detail ?? `The server returned ${res.status} ${res.statusText}.`, res.status);
  }
  return (await res.json()) as GazeResult;
}
