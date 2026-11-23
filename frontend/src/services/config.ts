// Runtime settings read from Vite env vars (see frontend/.env.example).
// No secrets belong here: everything in import.meta.env ships to the browser.

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

/**
 * When true (the default), the app uses the mock API in services/mock/ instead of the
 * FastAPI backend. Set VITE_USE_MOCK_API=false once the backend endpoints return real
 * analysis.
 */
export const USE_MOCK_API: boolean = (import.meta.env.VITE_USE_MOCK_API ?? "true") !== "false";
