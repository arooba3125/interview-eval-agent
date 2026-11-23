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

## Run

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173, expects the backend on :8000
```
