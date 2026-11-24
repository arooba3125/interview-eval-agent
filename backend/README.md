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
pip install -e "../models[text,speech,visual]"  # the ML package (+ torch/transformers, faster-whisper, mediapipe)
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

### Delivery measurements

The same response carries `delivery`: `metrics` for `speaking_pace`, `long_pauses`,
`filler_words` and `volume`, each with `status` (`measured` or `not_available`), `value`
(null when not available), `unit`, a plain-language `note` (or the reason it could not be
calculated) and `details` (e.g. pause times, filler breakdown, dB change). They are computed
from the same upload and decoded audio as the transcript, so nothing is uploaded twice.
Thresholds are documented in `models/README.md`. If measuring fails, every metric is
`not_available`; values are never invented.

## Gaze direction (approximate visual observation)

`POST /api/v1/analysis/gaze` takes 1–5 camera frames as repeated multipart fields `frames`
(JPEG or PNG, each at most `MAX_FRAME_UPLOAD_KB`, default 1000 KB) and returns `direction`
(`toward_screen`, `left`, `right`, `up`, `down`, or `null` when no face is found),
`confidence` (a 0–1 heuristic from agreement across frames, not a calibrated probability),
the angles, per-frame results, `"processed_locally": true` and `"frames_stored": false`.
Every response carries a notice that it is **not** a psychological or candidate assessment,
and the dataset licence (MPIIFaceGaze, CC BY-NC-SA 4.0, non-commercial; see `models/README.md`).

- Frames are read into memory (kept under Starlette's 1 MB spool limit, so they never touch
  the disk), analysed and dropped. Nothing is logged or saved.
- Models: `GAZE_MODEL_DIR` and `FACE_LANDMARKER_PATH`, defaulting to `../models/checkpoints/`.
  Loaded on the first request (about 15 s); then about 0.2 s per frame on CPU.
- Errors: no frames, more than 5, or a non-image → `422`; frame too large → `413`; model files
  missing → `503`.

```bash
curl -F "frames=@f1.jpg;type=image/jpeg" -F "frames=@f2.jpg;type=image/jpeg" http://localhost:8000/api/v1/analysis/gaze
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
