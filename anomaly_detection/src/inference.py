#!/usr/bin/env python3
"""
src/inference.py
================
FlowGuard anomaly-detection inference interface.

!! Model is trained on SYNTHETIC data (see src/generate_data.py) !!

Public surface
--------------
score_window(meter_id, readings)  ->  dict
    The one function teammates need.  Accepts raw L/hr values; handles
    normalisation and tensor conversion internally.

FlowGuardScorer                   –  class
    Instantiated once at process start; all state is read-only after __init__
    so it is safe to share across FastAPI worker threads.

get_scorer()                      ->  FlowGuardScorer
    Returns the module-level singleton, constructing it on first call.

Request / response contract
---------------------------
Input
    meter_id : str          one of the keys in models/scalers.json
                            e.g.  "meter_00" … "meter_04"
    readings : list[float]  exactly 24 hourly L/hr values, oldest first

Output  (dict)
    {
        "meter_id"  : str,
        "anomaly"   : bool,    # True  → flag this window for investigation
        "score"     : float,   # MSE reconstruction error (higher = more unusual)
        "threshold" : float,   # calibrated threshold from models/eval_results.json
        "n_readings": int,     # always 24
    }

Errors
    ValueError   – wrong meter_id or wrong number of readings
    RuntimeError – model/scaler files missing (run pipeline first)

Usage (Python)
--------------
    from src.inference import score_window
    result = score_window("meter_02", readings=[...24 floats...])
    if result["anomaly"]:
        alert(result)

Usage (CLI smoke-test)
----------------------
    python src/inference.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).parent))
from model import build_model        # noqa: E402
from preprocess import MeterScaler   # noqa: E402

_ROOT       = Path(__file__).parent.parent
MODELS_DIR  = _ROOT / "models"
WINDOW_SIZE = 24


# ── Scorer class ──────────────────────────────────────────────────────────────
class FlowGuardScorer:
    """
    Encapsulates everything needed for a single inference call:
    model weights, per-meter scaler, and the calibrated threshold.

    Designed to be constructed ONCE per process and reused across requests.
    All attributes are read-only after __init__, so no locking is needed.

    Parameters
    ----------
    models_dir : Path  – directory containing the four artefact files.
                         Defaults to  <project_root>/models/
    """

    def __init__(self, models_dir: Path = MODELS_DIR) -> None:
        required = {
            "train_config": models_dir / "train_config.json",
            "weights":      models_dir / "autoencoder.pt",
            "scalers":      models_dir / "scalers.json",
            "eval":         models_dir / "eval_results.json",
        }
        missing = [str(v) for v in required.values() if not v.exists()]
        if missing:
            raise RuntimeError(
                "Required model file(s) not found:\n  "
                + "\n  ".join(missing)
                + "\nRun:  generate_data → preprocess → train → evaluate"
            )

        # ── Architecture from training config ─────────────────────────────
        with open(required["train_config"]) as fh:
            cfg = json.load(fh)

        # ── Model (CPU, eval mode, gradients off) ──────────────────────────
        self._model = build_model(
            hidden_size=cfg["hidden_size"],
            num_layers=cfg["num_layers"],
        )
        self._model.load_state_dict(
            torch.load(required["weights"],
                       map_location="cpu",
                       weights_only=True)
        )
        self._model.eval()

        # ── Per-meter Min-Max scaler ───────────────────────────────────────
        self._scaler: MeterScaler = MeterScaler.load(required["scalers"])

        # ── Calibrated anomaly threshold ──────────────────────────────────
        with open(required["eval"]) as fh:
            ev = json.load(fh)
        self.threshold: float = float(ev["best_threshold"])
        self.strategy:  str   = ev["recommended"]   # "p99" or "mean3std"

        # ── Public metadata ───────────────────────────────────────────────
        self.meter_ids:   list[str] = list(self._scaler.params.keys())
        self.best_epoch:  int       = cfg["best_epoch"]
        self.best_val_mse:float     = cfg["best_val_mse"]

    # ── Core inference ────────────────────────────────────────────────────────
    def score_window(self,
                     meter_id: str,
                     readings: list[float]) -> dict[str, Any]:
        """
        Compute the anomaly score for a single 24-hour usage window.

        Parameters
        ----------
        meter_id : str          – must be in self.meter_ids
        readings : list[float]  – exactly 24 raw L/hr values, oldest first

        Returns
        -------
        dict with keys: meter_id, anomaly, score, threshold, n_readings

        Raises
        ------
        ValueError   – unknown meter_id or wrong reading count
        """
        # ── Input validation ──────────────────────────────────────────────
        if meter_id not in self._scaler.params:
            raise ValueError(
                f"Unknown meter_id '{meter_id}'. "
                f"Valid meters: {self.meter_ids}"
            )
        if len(readings) != WINDOW_SIZE:
            raise ValueError(
                f"Expected exactly {WINDOW_SIZE} readings, got {len(readings)}."
            )

        # ── Normalise using training-fit scaler for this meter ────────────
        raw    = np.array(readings, dtype=np.float32)
        scaled = self._scaler.transform(meter_id, raw)   # (24,)

        # ── Build (1, 24, 1) tensor and score ────────────────────────────
        x     = torch.from_numpy(scaled).unsqueeze(0).unsqueeze(-1)
        # shape: (batch=1, seq=24, features=1)
        score = float(self._model.reconstruction_error(x)[0])

        return {
            "meter_id":   meter_id,
            "anomaly":    bool(score >= self.threshold),
            "score":      round(score, 8),
            "threshold":  round(self.threshold, 8),
            "n_readings": WINDOW_SIZE,
        }


# ── Module-level lazy singleton ───────────────────────────────────────────────
_scorer: FlowGuardScorer | None = None


def get_scorer() -> FlowGuardScorer:
    """
    Return the process-wide scorer, building it on first call.
    Subsequent calls return the cached instance instantly.
    """
    global _scorer
    if _scorer is None:
        _scorer = FlowGuardScorer()
    return _scorer


# ── Convenience wrapper ───────────────────────────────────────────────────────
def score_window(meter_id: str, readings: list[float]) -> dict[str, Any]:
    """
    Module-level shortcut for teammates who want a one-liner import.

    Example
    -------
    >>> from src.inference import score_window
    >>> score_window("meter_00", readings)
    {'meter_id': 'meter_00', 'anomaly': False, 'score': 0.00142, ...}
    """
    return get_scorer().score_window(meter_id, readings)


# ── CLI smoke-test ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import pandas as pd

    scorer = FlowGuardScorer()
    print("FlowGuard inference engine ready")
    print(f"  Meters    : {scorer.meter_ids}")
    print(f"  Threshold : {scorer.threshold:.6f}  (strategy: {scorer.strategy})")
    print(f"  Model     : epoch {scorer.best_epoch}, "
          f"val MSE {scorer.best_val_mse:.6f}")
    print()

    # ── Case 1: real normal window from training CSV ───────────────────────
    df_train = pd.read_csv(_ROOT / "data" / "train_normal.csv",
                           parse_dates=["timestamp"])
    normal_24 = (df_train[df_train["meter_id"] == "meter_00"]
                 .iloc[:24]["consumption_L"].tolist())
    r = scorer.score_window("meter_00", normal_24)
    tag = "NORMAL  " if not r["anomaly"] else "ANOMALY "
    print(f"[{tag}] score={r['score']:.6f}  anomaly={r['anomaly']}")
    print(f"          readings mean={sum(normal_24)/len(normal_24):.1f} L/hr  "
          f"(real normal window)")

    # ── Case 2: sustained high draw (simulated leak) ──────────────────────
    leak_24 = [400.0] * 24   # way above training peak for meter_00 (~125 L/hr)
    r = scorer.score_window("meter_00", leak_24)
    tag = "NORMAL  " if not r["anomaly"] else "ANOMALY "
    print(f"\n[{tag}] score={r['score']:.6f}  anomaly={r['anomaly']}")
    print(f"          readings mean=400.0 L/hr  (simulated sustained leak)")

    # ── Case 3: flatline / sensor failure ─────────────────────────────────
    flat_24 = [1.0] * 24
    r = scorer.score_window("meter_00", flat_24)
    tag = "NORMAL  " if not r["anomaly"] else "ANOMALY "
    print(f"\n[{tag}] score={r['score']:.6f}  anomaly={r['anomaly']}")
    print(f"          readings mean=1.0 L/hr   (simulated sensor flatline)")

    # ── Case 4: bad input guard ────────────────────────────────────────────
    try:
        scorer.score_window("meter_99", [1.0] * 24)
    except ValueError as exc:
        print(f"\n[GUARD   ] ValueError correctly raised: {exc}")
