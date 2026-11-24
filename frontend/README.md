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

## No sample data

Nothing in the app is generated or invented. Every result comes from a live model or a
measurement of the actual recording: transcript, delivery measurements, text emotion and gaze.
Features that are not implemented show "Not available yet" instead of placeholder values:

- **Answer quality** (relevance, accuracy, completeness, key concepts) and content suggestions:
  not implemented, shown as *Not available yet*.
- **Report summary** (written strengths / areas to improve): not implemented; the report shows
  only what was answered and the measured delivery figures.

Sessions and questions run in the browser by default (`src/services/local/`): questions come
from the practice question bank in `questionBank.ts` (questions to answer, not results), and
sessions are kept in `localStorage` (`src/services/historyStore.ts`). Records saved by older
versions are cleaned on first read: demo sessions are dropped and any stored sample feedback is
removed. Set `VITE_USE_MOCK_API=false` (historical name) to take sessions and questions from
the FastAPI endpoints instead; their question bank is not filled in yet.

## Speech-to-text (live, local)

When a take is recorded, `useTranscription` sends the same recording (no second recorder)
to `POST /api/v1/analysis/transcribe`. The backend runs Whisper base.en through
faster-whisper on the CPU, so audio never leaves the machine. The text fills the
**Answer transcript** box, where the candidate reviews and edits it before submitting;
Submit is disabled while transcription runs. Loading, error (retry, or type it), and
"no speech detected" states are shown. "Record again" clears the transcript. Like the text
emotion result, the transcript is held in memory only and never written to history.

## Delivery observations (measured)

The transcription response also carries delivery measurements from the same recording:
speaking pace, long pauses (≥ 3 s), filler words (documented list) and relative volume change
(≥ 6 dB, last third vs first third). On the interview screen and the report, the "Delivery
observations" section shows them with a *Measured from your recording* badge, or "Could not
calculate" with the reason (no speech, too short, unsure transcript, or transcription failed);
never sample values. A "How these are measured" disclosure explains the thresholds. The
numbers and notes (no audio or transcript) are kept with the answer in `localStorage`
(`QuestionResult.measured_delivery`) so the report can show them. Answers saved before delivery
was measured show "Not available". Recording uses `autoGainControl: false` so volume changes
are not flattened by the browser.

## Gaze direction (live, local, approximate)

Only when the camera is on **and** the candidate ticked "Also generate camera cues" on the
device check page. While a take is recording, `useGazeObservation` grabs 3 small JPEG frames
(640 px wide, from an off-screen `<video>` via `FrameGrabber`) every ~3 s and posts them to
`POST /api/v1/analysis/gaze`. Frames are dropped after each request; only the direction and
confidence are kept, in memory, as a per-take tally. The `GazeObservation` card beside the
camera has its own states: off (no camera), not opted in, camera not available, waiting,
loading, live and error (with retry). It is kept apart from the transcript, delivery and
text emotion results, and always shows a notice that gaze is an approximate visual observation,
not a psychological or candidate assessment. Model data licence: CC BY-NC-SA 4.0
(non-commercial); see `models/README.md`.

## Experimental text emotion analysis (live)

When an answer is submitted with a transcript (transcribed and/or edited), `useTextEmotion`
sends it to `POST /api/v1/analysis/text-emotion`. The GoEmotions model scores 28 labels; the
main feedback shows only a configurable allowlist, defined and documented in
`src/domain/emotionFeedback.ts`:

| Label | Why it is listed | Suggestion shown (cautious, about the wording) |
|---|---|---|
| approval, optimism, nervousness | tone of the wording | e.g. "Some of your wording may sound uncertain. You could try stating your main point plainly…" |
| admiration, curiosity, excitement, gratitude | engagement in the wording | e.g. "Your wording may sound enthusiastic. You could try pairing that energy with specific details." |
| neutral | neutral wording | "Your wording may read as neutral and factual. You could try adding a short example…" |

Rules: a label is shown only if it is on the allowlist **and** at or above the model's
detection threshold (0.3, from `inference_config.json`); at most 3, highest first. If none
qualify: "No clear emotion signal detected." Each shown label adds its one suggestion from the
mapping; with no label shown: "No emotion-based suggestion is available for this answer."
Labels below the threshold never produce a suggestion. Labels keep the model's names and are
never renamed as confidence, anxiety, passion or knowledge. The full 28-label output, threshold,
model name and analysed transcript sit in a collapsed **Technical details** section. A standing
notice explains that the model detects emotional wording and was trained on Reddit comments,
so results may not generalise to interview answers.

The result (labels and scores, not the transcript) is saved with the answer so the report can
show the same panel. Loading, error (with retry), empty-transcript and "not available" states
are shown. Needs the backend running on port 8000.

## Run

```bash
cd frontend
cp .env.example .env   # optional; local question flow is the default
npm install
npm run dev            # http://localhost:5173 (proxies /api to the backend on :8000)
npm run build          # type-check and production build
```

Camera and microphone need `localhost` or https.
