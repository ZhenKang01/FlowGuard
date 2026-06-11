#!/usr/bin/env python3
"""
src/api.py
==========
Minimal FastAPI JSON endpoint wrapping the FlowGuard inference module.
No HTML, no forms — pure JSON REST API.

Endpoints
---------

POST /score
    Score a 24-hour water-usage window for a single meter.

    Request body  (Content-Type: application/json)
    ──────────────────────────────────────────────
    {
      "meter_id" : "meter_02",
      "readings" : [12.3, 8.5, 6.1, ..., 45.2]
    }

    Fields
        meter_id  string   required   one of "meter_00" … "meter_04"
        readings  array    required   exactly 24 non-negative floats
                                      in L/hr, oldest reading first

    Response 200
    ────────────
    {
      "meter_id"  : "meter_02",
      "anomaly"   : true,
      "score"     : 0.03124567,
      "threshold" : 0.00491800,
      "n_readings": 24
    }

    Fields
        anomaly    bool    true if score >= threshold
        score      float   MSE reconstruction error; higher = more unusual
        threshold  float   calibrated anomaly threshold from eval_results.json

    Response 400  Bad Request
        {"detail": "Unknown meter_id 'meter_99'. Valid meters: [...]"}
        {"detail": "Expected exactly 24 readings, got 10."}
        {"detail": "All readings must be >= 0 (L/hr cannot be negative)."}

    Response 422  Unprocessable Entity
        Pydantic schema validation failure (wrong types, missing fields).

    Response 503  Service Unavailable
        {"detail": "Model not loaded. Run the pipeline first."}


GET /health
    Liveness check.

    Response 200
    ────────────
    {"status": "ok", "model_loaded": true}


GET /meters
    List the meter IDs the scorer currently knows about.

    Response 200
    ────────────
    {"meter_ids": ["meter_00", "meter_01", "meter_02", "meter_03", "meter_04"]}


Usage
-----
    # From the project root:
    python src/api.py

    # Or via uvicorn directly:
    cd src && uvicorn api:app --host 0.0.0.0 --port 8000 --reload

    # Quick curl tests (once running):
    curl http://localhost:8000/health
    curl http://localhost:8000/meters
    curl -X POST http://localhost:8000/score \\
         -H "Content-Type: application/json" \\
         -d '{"meter_id":"meter_00","readings":[30]*24}'
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

sys.path.insert(0, str(Path(__file__).parent))
from inference import FlowGuardScorer, WINDOW_SIZE    # noqa: E402

# ── Pydantic request / response schemas ───────────────────────────────────────

class ScoreRequest(BaseModel):
    """
    Body for POST /score.
    Pydantic validates types and length before the handler runs.
    """
    meter_id: str = Field(
        ...,
        examples=["meter_02"],
        description="Meter identifier — must match a key in models/scalers.json.",
    )
    readings: Annotated[list[float], Field(
        min_length=WINDOW_SIZE,
        max_length=WINDOW_SIZE,
        description=(
            f"Exactly {WINDOW_SIZE} consecutive hourly water-consumption "
            "values in L/hr, oldest reading first."
        ),
    )]

    @field_validator("readings")
    @classmethod
    def readings_non_negative(cls, v: list[float]) -> list[float]:
        """Physical guard: flow cannot be negative."""
        if any(r < 0 for r in v):
            raise ValueError(
                "All readings must be >= 0 (L/hr cannot be negative)."
            )
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "meter_id": "meter_02",
                "readings": [5.2, 3.1, 2.8, 2.5, 2.4, 3.9,
                             18.4, 55.2, 82.1, 91.3, 88.7, 76.4,
                             70.1, 74.8, 79.2, 81.0, 77.6, 60.3,
                             44.1, 32.8, 22.5, 14.2, 9.6, 6.7],
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


# ── App lifecycle — load scorer once at startup ───────────────────────────────
_scorer: FlowGuardScorer | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Load the scorer on startup; nothing to clean up on shutdown."""
    global _scorer
    try:
        _scorer = FlowGuardScorer()
        print(f"[FlowGuard] Scorer ready  |  "
              f"meters={_scorer.meter_ids}  |  "
              f"threshold={_scorer.threshold:.6f}")
    except RuntimeError as exc:
        # Server stays up but /score will return 503 until files exist
        print(f"[FlowGuard] Scorer NOT loaded: {exc}")
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FlowGuard Anomaly Detection API",
    description=(
        "LSTM autoencoder that scores 24-hour water-usage windows for leaks "
        "and sensor faults.\n\n"
        "**Prototype notice:** trained on synthetic data (hackathon build).\n\n"
        "Call **POST /score** with a `meter_id` and 24 hourly L/hr readings. "
        "Receive `anomaly: true/false` and a raw `score` for your own thresholding."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React dashboard (any origin during hackathon)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten to dashboard origin in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _require_scorer() -> FlowGuardScorer:
    """Raise 503 if scorer failed to load at startup."""
    if _scorer is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model not loaded. "
                "Run the pipeline first:  "
                "generate_data → preprocess → train → evaluate"
            ),
        )
    return _scorer


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
def score(req: ScoreRequest) -> ScoreResponse:
    """
    Score one 24-hour window for anomalous water usage.

    - Internally applies the per-meter Min-Max scaler trained on normal data.
    - Passes the normalised window through the LSTM autoencoder.
    - Returns `anomaly: true` if the reconstruction error exceeds the
      calibrated threshold.
    """
    scorer = _require_scorer()
    try:
        result = scorer.score_window(req.meter_id, req.readings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ScoreResponse(**result)


# ── GET /health ───────────────────────────────────────────────────────────────
@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness check",
)
def health() -> HealthResponse:
    """Returns 200 whether or not the model is loaded (use `model_loaded` field)."""
    return HealthResponse(status="ok", model_loaded=_scorer is not None)


# ── GET /meters ───────────────────────────────────────────────────────────────
@app.get(
    "/meters",
    response_model=MetersResponse,
    summary="List valid meter IDs",
)
def meters() -> MetersResponse:
    """List the meter IDs this instance can score."""
    return MetersResponse(meter_ids=_require_scorer().meter_ids)


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Run from the project root: python src/api.py
    uvicorn.run(
        "api:app",
        app_dir=str(Path(__file__).parent),   # so uvicorn finds api.py in src/
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
