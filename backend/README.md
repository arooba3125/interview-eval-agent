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
pip install -e ../models          # the ML package
uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs.
