# Backend (FastAPI, layered MVC)

The backend runs interview sessions, receives answers from the browser, sends them
through the analysis pipelines in `../models`, and returns feedback.

## Why layered MVC

The backend has no UI of its own, so "View" here means the JSON responses (`schemas/`).
Each layer has one job and only calls the layer below it:

| Layer | Folder | Role in MVC | What it does |
|---|---|---|---|
| Routes | `app/api/v1/routes/` | Controller | Parse the HTTP/WebSocket request, call a service, return a schema. No business logic. |
| Schemas | `app/schemas/` | View | Pydantic request/response shapes the frontend relies on. |
| Services | `app/services/` | Model (logic) | Interview flow, calling the ML pipelines, building feedback. |
| Repositories | `app/repositories/` | Model (data) | Read/write sessions, questions, results. Hides the database. |
| DB | `app/db/` | Model (data) | ORM tables and the database connection. |
| Core | `app/core/` | — | Settings and shared config. |

This keeps the deep learning code swappable: services talk to `ie_models` through one
adapter (`services/analysis_service.py`), so a model change does not touch the routes.

## Run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -e "../models[text,speech]"  # the ML package (+ torch/transformers, faster-whisper)
uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs.

## Speech-to-text

`POST /api/v1/analysis/transcribe` takes the answer recording as multipart field `audio`
(webm/opus from the browser; mp4, ogg and wav also work, and video files are read for their
audio) and returns `transcript`, `speech_detected`, `duration_s`, word timestamps, `model`
and `"processed_locally": true`. It runs Whisper base.en with faster-whisper on the CPU;
nothing is sent off the machine.

- Weights default to `../models/checkpoints/faster-whisper-base.en` (see `models/README.md`
  to download them once); set `SPEECH_MODEL_DIR` to use another folder. Loaded on the first
  request.
- Errors: empty or undecodable recording → `422`; larger than `MAX_AUDIO_UPLOAD_MB`
  (default 50) → `413`; model folder missing or unloadable → `503`. No speech is not an
  error: `transcript` is empty and `speech_detected` is `false`.

```bash
curl -F "audio=@answer.webm;type=audio/webm" http://localhost:8000/api/v1/analysis/transcribe
```

## Experimental text emotion analysis

`POST /api/v1/analysis/text-emotion` with `{"transcript": "..."}` runs the BERT model
fine-tuned on GoEmotions (`model-training/text/`) and returns the emotions expressed in the
wording: `detected_labels` (at or above the saved threshold), `scores` for all 28 labels and
`top_label`. Every response carries `"experimental": true` and a notice that it is **not** a
measure of knowledge, correctness, confidence, anxiety, passion or job suitability.

- The model folder defaults to `../model-training/text/outputs/bert-goemotions-full/model`;
  set `TEXT_EMOTION_MODEL_DIR` to use another one. It is loaded on the first request and
  never downloaded.
- Errors: empty transcript → `422`; model folder, tokenizer or `inference_config.json`
  missing or unreadable → `503` with the reason.
- Long transcripts are split into overlapping 128-token windows; each label keeps its
  highest probability across windows.
