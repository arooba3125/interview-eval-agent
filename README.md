# interview-eval-agent

AI Interview Agent is a deep learning project that helps candidates practise interviews.
It asks role-based questions on screen, records the spoken answer through the microphone
(and, with consent, the camera), and after each question shows:

1. **Knowledge level** of the topic
2. **Correctness** of the answer (plus relevance and completeness)
3. **Confidence-related delivery observations** (pace, pauses, gaze, gestures)
4. **Suggestions** to improve the answer

At the end it gives an interview summary with strengths, areas to improve and patterns.

## Repository structure

```
interview-eval-agent/
├── frontend/   React + TypeScript app (MVVM)          → frontend/README.md
├── backend/    FastAPI service (layered MVC)          → backend/README.md
└── models/     Deep learning pipelines (ie_models)    → models/README.md
```

| Part | Pattern | Why |
|---|---|---|
| `frontend/` | **MVVM** | The interview screen holds a lot of live state (camera/mic streams, recording, analysis status, feedback). React hooks act as ViewModels that own that state, so the Views stay simple. |
| `backend/` | **Layered MVC** (routes → services → repositories) | A JSON API with no UI. Routes are thin controllers, Pydantic schemas are the "view", services and repositories hold the logic and data. ML is reached through one adapter, so models can change without touching the API. |
| `models/` | **Pipeline per analysis path** | MVC doesn't suit ML code. Each analysis (speech-to-text, answer scoring, vocal, visual) is an independent module with one entry function, trained and tested on its own. |

## End-to-end flow

```
 Candidate                    frontend/                    backend/                     models/ (ie_models)
 ─────────                    ─────────                    ────────                     ───────────────────
 1. pick role, level,   ──►  SetupPage            ──►  POST /sessions
    type, consent                                       InterviewService
 2. sees question       ◄──  InterviewPage        ◄──  GET  /sessions/{id}/next-question
                             QuestionCard               QuestionService
 3. answers on mic/cam  ──►  useMediaRecorder     ──►  POST /sessions/{id}/answers
                             (records webm)             EvaluationService
                                                          │
 4. analysis                                              ├─► AnalysisService ──► speech_to_text   → transcript
                                                          │                  ├──► answer_scoring   → relevance, correctness,
                                                          │                  │                       completeness, knowledge level
                                                          │                  ├──► vocal_analysis   → pace, pauses, volume, pitch
                                                          │                  └──► visual_analysis  → gaze, facial & hand movement
                                                          │                                          (only with consent)
                                                          └─► feedback.build_suggestions
 5. sees feedback       ◄──  FeedbackPanel        ◄──  AnswerFeedback JSON
 6. next / review       ──►  useInterviewSession  ──►  (repeat 2–5)
 7. summary             ◄──  SummaryPage          ◄──  GET  /sessions/{id}/summary
```

1. **Set up.** The candidate picks job role, experience level and interview type, and
   chooses whether to allow camera analysis. The backend creates a session.
2. **Show a question.** The backend picks the next question from the question bank and the
   frontend shows it.
3. **Capture the answer.** When the candidate is ready, the browser records audio (and video
   if consented) and uploads it when they finish.
4. **Analyse.** The backend runs three paths through `ie_models`:
   - *Answer content:* speech-to-text, then relevance, key concepts, correctness, completeness.
   - *Speaking style:* pace, pauses, volume, vocal variation.
   - *Visible behaviour:* gaze direction, facial movement, hand movement.
5. **Feedback for that question.** Knowledge and answer quality, delivery observations, and
   specific suggestions.
6. **Continue or review.** Steps 2 to 5 repeat for each question.
7. **Summary.** Overall strengths, areas to improve, and patterns across answers, with examples.

## Important design decision

Knowledge and correctness are assessments of **what the candidate said**.

Camera and voice analysis are **observable communication signals, not proof of confidence,
anxiety or passion**. Expressions, eye movement and gestures alone can't reliably show those
internal qualities, and they differ between people and cultures. The app therefore reports
specific observations ("you paused for more than 4 seconds three times", "you looked away
from the screen for about 40% of the answer") and avoids definitive labels like "anxious"
or "not confident". Camera analysis only runs when the candidate opts in.

## Roadmap

- **v1:** steps 1 to 5 with prepared questions, speech-to-text, answer-content scoring and
  simple vocal delivery feedback.
- **v2:** visual analysis (gaze, facial and hand movement) and the end-of-interview summary.
- **Later:** generated questions per role, streaming (WebSocket) analysis during the answer,
  persistent history across sessions.

## Quick start

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && pip install -e ../models
uvicorn app.main:app --reload            # http://localhost:8000/docs

# frontend (new terminal)
cd frontend && npm install && npm run dev   # http://localhost:5173
```
