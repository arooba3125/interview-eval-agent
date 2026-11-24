// Runtime settings read from Vite env vars (see frontend/.env.example).
// No secrets belong here: everything in import.meta.env ships to the browser.

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

/**
 * When true (the default), sessions and questions run in the browser from the practice
 * question bank (services/local). When false, they come from the FastAPI session/question
 * endpoints, whose question bank is not filled in yet. Either way, all analysis results come
 * from the live backend models; nothing is generated in the browser.
 *
 * VITE_USE_MOCK_API is the variable's historical name and is kept for existing .env files.
 */
export const USE_LOCAL_QUESTIONS: boolean = (import.meta.env.VITE_USE_MOCK_API ?? "true") !== "false";
