import type { InterviewConfig } from "../domain/types";

// Carries the setup form's choices to the device-check step, and survives a reload.
const KEY = "ie.setupDraft.v1";

export const setupDraft = {
  load(): InterviewConfig | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as InterviewConfig) : null;
    } catch {
      return null;
    }
  },
  save(config: InterviewConfig): void {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(config));
    } catch {
      /* ignore */
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
