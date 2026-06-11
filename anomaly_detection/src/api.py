#!/usr/bin/env python3
"""
src/api.py
==========
FastAPI JSON endpoint wrapping the FlowGuard inference module.

Endpoints
---------

POST /score
    Score a 24-hour water-usage window for a single meter.
    On anomaly, fires a non-blocking POST to the n8n webhook (BackgroundTasks).

GET /health
    Liveness check.

GET /meters
    List the meter IDs the scorer currently knows about.

POST /alerts
    Store a new alert (called by n8n after routing).

GET /alerts
    Return the last 50 alerts from the in-memory store.

PATCH /alerts/{alert_id}/approve
    Mark a pending_approval alert as approved (human-in-the-loop).

Usage
-----
    # From anomaly_detection/:
    uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload

    # Set n8n webhook URL (optional — /score still works without it):
    export N8N_WEBHOOK_URL=http://localhost:5678/webhook/flowguard-anomaly

    # curl tests:
    curl http://localhost:8000/health
    curl http://localhost:8000/alerts
    curl -X POST http://localhost:8000/score \\
         -H "Content-Type: application/json" \\
         -d '{"meter_id":"meter_02","readings":[350,380,400,420,410,390,400,415,408,395,420,435,410,400,390,405,415,425,410,400,395,385,375,360]}'
"""

from __future__ import annotations

import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Optional

import httpx
import uvicorn
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

sys.path.insert(0, str(Path(__file__).parent))
from inference import FlowGuardScorer, WINDOW_SIZE    # noqa: E402
from chatbot.agent import FlowGuardAgent              # noqa: E402

logger = logging.getLogger("flowguard.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ── Environment ───────────────────────────────────────────────────────────────

# Set via shell: export N8N_WEBHOOK_URL=http://localhost:5678/webhook/flowguard-anomaly
N8N_WEBHOOK_URL: str = os.getenv(
    "N8N_WEBHOOK_URL",
    "http://localhost:5678/webhook/flowguard-anomaly",
)

# ── In-memory alert store ─────────────────────────────────────────────────────
# Stores alerts POSTed back by n8n after routing.  Survives only for the
# lifetime of the process — a real deployment would use a database.
_alerts: list[dict] = []


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    meter_id: str = Field(..., examples=["meter_02"])
    readings: Annotated[list[float], Field(
        min_length=WINDOW_SIZE,
        max_length=WINDOW_SIZE,
        description=f"Exactly {WINDOW_SIZE} consecutive hourly L/hr values, oldest first.",
    )]

    @field_validator("readings")
    @classmethod
    def readings_non_negative(cls, v: list[float]) -> list[float]:
        if any(r < 0 for r in v):
            raise ValueError("All readings must be >= 0 (L/hr cannot be negative).")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "meter_id": "meter_02",
                "readings": [350,380,400,420,410,390,400,415,408,395,
                             420,435,410,400,390,405,415,425,410,400,
                             395,385,375,360],
            }
        }
    }


class ScoreResponse(BaseModel):
    meter_id:   str
    anomaly:    bool  = Field(description="True if score >= threshold")
    score:      float = Field(description="MSE reconstruction error")
    threshold:  float = Field(description="Calibrated anomaly threshold")
    n_readings: int


class HealthResponse(BaseModel):
    status:       str
    model_loaded: bool


class MetersResponse(BaseModel):
    meter_ids: list[str]


class AlertCreate(BaseModel):
    """Body for POST /alerts — typically sent by n8n after routing."""
    meter_id:       str
    score:          float
    threshold:      float
    severity:       str   = Field(description="low | medium | high")
    timestamp:      str
    status:         str   = Field(default="active")
    recommendation: str   = Field(default="")


# ── App lifecycle ─────────────────────────────────────────────────────────────
_scorer: FlowGuardScorer | None = None
_agent:  FlowGuardAgent  | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _scorer, _agent
    try:
        _scorer = FlowGuardScorer()
        logger.info(
            "Scorer ready | meters=%s | threshold=%.6f",
            _scorer.meter_ids, _scorer.threshold,
        )
    except RuntimeError as exc:
        logger.warning("Scorer NOT loaded: %s", exc)

    try:
        _agent = FlowGuardAgent()
        logger.info("Chat agent ready")
    except Exception as exc:
        logger.warning("Chat agent failed to initialise: %s", exc)

    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FlowGuard Anomaly Detection API",
    description=(
        "LSTM autoencoder that scores 24-hour water-usage windows for leaks.\n\n"
        "On anomaly, POST /score fires a non-blocking n8n webhook notification "
        "so the dashboard receives live alerts via the three-layer pipeline."
    ),
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


def _require_scorer() -> FlowGuardScorer:
    if _scorer is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Run the pipeline first: generate_data → preprocess → train → evaluate",
        )
    return _scorer


def _severity(score: float, threshold: float) -> str:
    """Map score/threshold ratio to severity label.

    ratio < 1.5   → low    (marginal anomaly)
    1.5 ≤ ratio < 3 → medium
    ratio ≥ 3       → high  (human review required via n8n Wait node)
    """
    ratio = score / threshold
    if ratio >= 3.0:
        return "high"
    if ratio >= 1.5:
        return "medium"
    return "low"


def _notify_n8n(payload: dict) -> None:
    """POST anomaly payload to n8n webhook — runs in a background thread.

    Non-blocking and fault-tolerant: a timeout, connection error, or any other
    failure is logged but never re-raised.  /score always returns to the caller
    before this function even starts, so n8n outages are invisible to the
    dashboard.
    """
    try:
        with httpx.Client(timeout=5.0) as client:
            r = client.post(N8N_WEBHOOK_URL, json=payload)
            r.raise_for_status()
            logger.info("n8n notified for %s (severity=%s)", payload["meter_id"], payload["severity"])
    except Exception as exc:
        # Log and swallow — never propagate to the caller
        logger.warning("n8n notification failed (non-fatal): %s", exc)


# ── POST /score ───────────────────────────────────────────────────────────────
@app.post(
    "/score",
    response_model=ScoreResponse,
    summary="Score a 24-hour water-usage window",
    responses={
        400: {"description": "Unknown meter_id or wrong reading count"},
        503: {"description": "Model not loaded — run pipeline first"},
    },
)
def score(req: ScoreRequest, background_tasks: BackgroundTasks) -> ScoreResponse:
    """Score one window; on anomaly, enqueue a non-blocking n8n notification."""
    scorer = _require_scorer()
    try:
        result = scorer.score_window(req.meter_id, req.readings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if result["anomaly"]:
        severity = _severity(result["score"], result["threshold"])
        payload = {
            "meter_id":  req.meter_id,
            "score":     result["score"],
            "threshold": result["threshold"],
            "severity":  severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        # FastAPI runs this in a thread pool AFTER the response is sent —
        # the client never waits for n8n to respond.
        background_tasks.add_task(_notify_n8n, payload)

    return ScoreResponse(**result)


# ── GET /health ───────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, summary="Liveness check")
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=_scorer is not None)


# ── GET /meters ───────────────────────────────────────────────────────────────
@app.get("/meters", response_model=MetersResponse, summary="List valid meter IDs")
def meters() -> MetersResponse:
    return MetersResponse(meter_ids=_require_scorer().meter_ids)


# ── POST /alerts ──────────────────────────────────────────────────────────────
@app.post(
    "/alerts",
    summary="Store an alert (called by n8n after routing)",
    status_code=201,
)
def create_alert(body: AlertCreate) -> dict:
    """n8n POSTs here after deciding severity and appending its recommendation."""
    alert = {
        "id":             str(uuid.uuid4()),
        **body.model_dump(),
    }
    _alerts.append(alert)
    logger.info("Alert stored: id=%s meter=%s severity=%s", alert["id"], alert["meter_id"], alert["severity"])
    return alert


# ── GET /alerts ───────────────────────────────────────────────────────────────
@app.get("/alerts", summary="Return recent alerts")
def get_alerts() -> dict:
    """Returns the last 50 alerts (most recent last).  Dashboard polls this."""
    return {"alerts": _alerts[-50:]}


# ── PATCH /alerts/{alert_id}/approve ─────────────────────────────────────────
@app.patch(
    "/alerts/{alert_id}/approve",
    summary="Approve a pending_approval alert (human-in-the-loop)",
)
def approve_alert(alert_id: str) -> dict:
    """Set status to 'approved'.  Returns the updated alert or 404."""
    for alert in _alerts:
        if alert["id"] == alert_id:
            alert["status"] = "approved"
            logger.info("Alert approved: id=%s meter=%s", alert_id, alert["meter_id"])
            return alert
    raise HTTPException(status_code=404, detail=f"Alert {alert_id!r} not found.")


# ── POST /chat ────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message:              str
    user_role:            str              = Field(default="viewer", description="Caller's RBAC role")
    conversation_history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply:      str
    intent:     str   = Field(description="Classified intent: protocol_question | log_issue | query_status | smalltalk | error")
    confidence: float = Field(description="Router confidence 0–1")


@app.post(
    "/chat",
    response_model=ChatResponse,
    summary="Conversational agent — intent router + three tools",
)
def chat(req: ChatRequest) -> ChatResponse:
    """
    Single endpoint for the FlowGuard chat widget.

    Steps:
      1. Intent router classifies the message.
      2. Dispatches to the matching tool (RAG / work-order / live-status / smalltalk).
      3. Returns the reply AND the detected intent so the UI can display routing.

    The LLM API key is server-side only — never exposed to the React client.
    """
    if _agent is None:
        raise HTTPException(
            status_code=503,
            detail="Chat agent not initialised. Check OPENAI_API_KEY and server logs.",
        )

    history = [{"role": m.role, "content": m.content} for m in req.conversation_history]

    result = _agent.process(
        message=req.message,
        user_role=req.user_role,
        conversation_history=history,
        current_alerts=_alerts[-20:],
        scorer=_scorer,
    )
    return ChatResponse(**result)


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        app_dir=str(Path(__file__).parent),
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
