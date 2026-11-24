# Frontend (React + TypeScript, MVVM)

The candidate-facing app: interview setup, the live question screen with camera and
microphone, and the feedback screens.

## Why MVVM

The interview screen is full of live state: camera/mic streams, recording status,
timers, upload progress, feedback arriving after analysis. MVVM keeps that state out
of the UI components:

| Layer | Folder | What it holds |
|---|---|---|
| Model | `src/domain/` | TypeScript types that mirror the backend schemas (Session, Question, AnswerFeedback). |
| Model (I/O) | `src/services/` | API client and browser media access (camera, mic, MediaRecorder). No React. |
| ViewModel | `src/viewmodels/` | Custom hooks (`useInterviewSession`, `useMediaRecorder`) that own state and actions and expose them to views. |
| View | `src/views/` | Pages and components. They render what the viewmodel gives them and call its actions. No fetch calls or media code. |

React hooks map naturally to viewmodels, which is why MVVM fits better here than MVC.

## Screens and flow

Welcome (`/`) → Setup (`/setup`) → Device check and consent (`/setup/devices`) →
Interview room (`/interview/:id`) → Report (`/interview/:id/summary`). Previous sessions live at `/history`.

## Mock mode (default)

The backend's analysis endpoints are still stubs, so the app runs against
`src/services/mock/` by default. Everything shown is **sample data**, labelled
in the UI: questions come from a small bank, feedback is generated from a seeded
generator, and recordings stay in the browser for replay only. Sessions are kept
in `localStorage` (`src/services/historyStore.ts`).

To use the FastAPI backend instead, set `VITE_USE_MOCK_API=false` in `.env`.
Viewmodels only talk to `services/interviewApi.ts`, so no view code changes.

## Experimental text emotion analysis (live)

The interview screen has an optional **Answer transcript** box (speech-to-text is not
connected yet). When an answer is submitted with a transcript, `useTextEmotion` sends it
to `POST /api/v1/analysis/text-emotion` through the Vite `/api` proxy, in mock mode too,
since it is the one real model in the app. The result appears in its own "Text emotion
analysis" section of the feedback panel, badged *Experimental · live model*, with loading,
error (with retry) and "no transcript" states. It is held in memory only: it is never
written to the mock session history, reports or previous sessions. It describes emotions
expressed in the wording, never knowledge, correctness, confidence, anxiety, passion or
job suitability. Needs the backend running on port 8000.

Delivery feedback is shown as observable cues (pace, pauses, volume, optional
face-toward-camera ratio). The UI never presents them as evidence of confidence,
anxiety, passion or job suitability.

## Run

```bash
cd frontend
cp .env.example .env   # optional; mock mode is the default
npm install
npm run dev            # http://localhost:5173 (proxies /api to :8000 when mock mode is off)
npm run build          # type-check and production build
```

Camera and microphone need `localhost` or https.
