#!/usr/bin/env python3
"""
src/preprocess.py
=================
Data-loading, normalisation, and windowing pipeline for FlowGuard.

!! DATA CONSUMED HERE IS FULLY SYNTHETIC (see src/generate_data.py) !!

Pipeline (per meter)
--------------------
1. Load train_normal.csv and test_anomalies.csv
2. Resample each meter's series to a strict hourly cadence;
   linear-interpolate any gaps
3. Fit a per-meter Min-Max scaler on training values ONLY;
   persist params to models/scalers.json
4. Apply scaler to both train and test series
5. Slice overlapping 24-hour windows with stride = 1 h
6. Split training windows into train / val by time (last 20% -> val)
7. Pool all meters and return PyTorch tensors

Usage (script)
--------------
    python src/preprocess.py

Usage (module)
--------------
    from src.preprocess import load_and_preprocess, MeterScaler
    splits = load_and_preprocess()
    X_train, X_val, X_test, y_test = (splits[k] for k in
                                       ('X_train','X_val','X_test','y_test'))
"""

import json
import numpy as np
import pandas as pd
import torch
from pathlib import Path
from typing import Dict, Tuple

# ── Default paths & hyper-parameters ─────────────────────────────────────────
_ROOT        = Path(__file__).parent.parent
DATA_DIR     = _ROOT / "data"
MODELS_DIR   = _ROOT / "models"

WINDOW_SIZE  = 24     # hours per window – one full calendar day
STRIDE       = 1      # hours between consecutive window starts
VAL_FRACTION = 0.20   # fraction of training windows reserved for validation


# ── Scaler ────────────────────────────────────────────────────────────────────
class MeterScaler:
    """
    Per-meter Min-Max scaler: maps each meter's training range to [0, 1].

    Fitted on training data ONLY so that anomalously high/low values in
    the test set can legitimately exceed [0, 1] – the model will produce
    high reconstruction error for those out-of-distribution inputs.

    Serialises to / deserialises from a plain JSON file for portability.
    """

    def __init__(self) -> None:
        self.params: Dict[str, Tuple[float, float]] = {}  # {meter_id: (min, max)}

    def fit(self, meter_id: str, values: np.ndarray) -> None:
        """Record min/max of *training* values for this meter."""
        self.params[meter_id] = (float(values.min()), float(values.max()))

    def transform(self, meter_id: str, values: np.ndarray) -> np.ndarray:
        """
        Apply stored min/max scaling.
        Values below training min are clamped to 0 (cannot be negative flow).
        Values above training max are allowed to exceed 1 (anomaly signal).
        """
        lo, hi = self.params[meter_id]
        if hi == lo:          # degenerate case – constant series
            return np.zeros_like(values, dtype=np.float32)
        scaled = (values - lo) / (hi - lo)
        return np.clip(scaled, 0.0, None).astype(np.float32)

    def inverse_transform(self, meter_id: str, scaled: np.ndarray) -> np.ndarray:
        """Undo Min-Max scaling (for debugging / plotting)."""
        lo, hi = self.params[meter_id]
        return scaled * (hi - lo) + lo

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as fh:
            json.dump(self.params, fh, indent=2)
        print(f"  Scalers saved  -> {path}")

    @classmethod
    def load(cls, path: Path) -> "MeterScaler":
        instance = cls()
        with open(path) as fh:
            instance.params = json.load(fh)
        return instance


# ── Helpers ───────────────────────────────────────────────────────────────────
def _resample_and_fill(series: pd.Series, agg: str = "mean") -> pd.Series:
    """
    Resample a time-indexed Series to strict hourly frequency,
    aggregate with `agg`, then linear-interpolate any NaN gaps.
    The data should already be hourly; this call mainly guarantees
    a gap-free index before windowing.
    """
    resampled = series.resample("h").agg(agg)
    n_gaps = int(resampled.isna().sum())
    if n_gaps:
        resampled = resampled.interpolate(method="time")
        print(f"    Interpolated {n_gaps} missing hour(s)")
    return resampled


def _make_windows(
    values: np.ndarray,
    labels: np.ndarray | None = None,
    window_size: int = WINDOW_SIZE,
    stride: int = STRIDE,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Slide a window over a 1-D array and collect (window, label) pairs.

    Parameters
    ----------
    values      : float32 array, shape (T,)
    labels      : int array, shape (T,), or None (train/val usage)
    window_size : number of time steps in each window
    stride      : gap between successive window start positions

    Returns
    -------
    windows  : float32 array, shape (N, window_size, 1)
               The trailing '1' is the feature dimension expected by the LSTM.
    win_labs : int64 array, shape (N,)
               1 if ANY of the window's hours has is_anomaly=1, else 0.
    """
    starts   = range(0, len(values) - window_size + 1, stride)
    windows  = np.stack(
        [values[i : i + window_size] for i in starts], axis=0
    )[:, :, np.newaxis]                        # (N, window_size, 1)

    if labels is not None:
        win_labs = np.array(
            [int(labels[i : i + window_size].max()) for i in starts],
            dtype=np.int64,
        )
    else:
        win_labs = np.zeros(len(starts), dtype=np.int64)

    return windows.astype(np.float32), win_labs


# ── Main pipeline ─────────────────────────────────────────────────────────────
def load_and_preprocess(
    window_size:   int   = WINDOW_SIZE,
    stride:        int   = STRIDE,
    val_fraction:  float = VAL_FRACTION,
    data_dir:      Path  = DATA_DIR,
    models_dir:    Path  = MODELS_DIR,
) -> dict:
    """
    Full preprocessing pipeline.

    Returns
    -------
    dict with keys
        X_train  torch.FloatTensor  (N_tr,  window_size, 1)  – normal windows
        X_val    torch.FloatTensor  (N_val, window_size, 1)  – normal windows
        X_test   torch.FloatTensor  (N_te,  window_size, 1)  – mixed
        y_test   torch.LongTensor   (N_te,)                  – 1 = anomaly window
        scaler   MeterScaler        fitted & saved to disk
    """
    models_dir.mkdir(parents=True, exist_ok=True)

    df_train = pd.read_csv(
        data_dir / "train_normal.csv", parse_dates=["timestamp"]
    )
    df_test = pd.read_csv(
        data_dir / "test_anomalies.csv", parse_dates=["timestamp"]
    )

    meter_ids = sorted(df_train["meter_id"].unique())
    scaler    = MeterScaler()

    all_train, all_val, all_test, all_y_test = [], [], [], []

    for meter_id in meter_ids:
        print(f"  {meter_id}")

        # ── Slice this meter ──────────────────────────────────────────────
        tr_indexed = (df_train[df_train["meter_id"] == meter_id]
                      .set_index("timestamp"))
        te_indexed = (df_test[df_test["meter_id"] == meter_id]
                      .set_index("timestamp"))

        # ── Resample & interpolate ────────────────────────────────────────
        tr_series  = _resample_and_fill(tr_indexed["consumption_L"], agg="mean")
        te_series  = _resample_and_fill(te_indexed["consumption_L"], agg="mean")
        # Labels: take max within each hour (already hourly, so no change)
        te_lab_series = (
            _resample_and_fill(te_indexed["is_anomaly"].astype(float), agg="max")
            .fillna(0)
            .astype(int)
        )

        # ── Fit scaler on training values only ────────────────────────────
        scaler.fit(meter_id, tr_series.values)

        # ── Normalise ─────────────────────────────────────────────────────
        tr_scaled  = scaler.transform(meter_id, tr_series.values)
        te_scaled  = scaler.transform(meter_id, te_series.values)
        te_labels  = te_lab_series.values

        # ── Sliding windows ───────────────────────────────────────────────
        tr_wins, _          = _make_windows(tr_scaled, labels=None,
                                            window_size=window_size, stride=stride)
        te_wins, te_win_lab = _make_windows(te_scaled, labels=te_labels,
                                            window_size=window_size, stride=stride)

        # ── Temporal train / val split (no shuffle) ───────────────────────
        n_val = max(1, int(len(tr_wins) * val_fraction))
        n_tr  = len(tr_wins) - n_val
        all_train.append(tr_wins[:n_tr])
        all_val.append(tr_wins[n_tr:])

        all_test.append(te_wins)
        all_y_test.append(te_win_lab)

        print(f"    train windows : {n_tr:>6,}  |  "
              f"val : {n_val:>5,}  |  "
              f"test : {len(te_wins):>5,}  "
              f"(anomalous: {int(te_win_lab.sum())})")

    # ── Concatenate across meters and convert to tensors ──────────────────────
    X_train = torch.from_numpy(np.concatenate(all_train, axis=0))
    X_val   = torch.from_numpy(np.concatenate(all_val,   axis=0))
    X_test  = torch.from_numpy(np.concatenate(all_test,  axis=0))
    y_test  = torch.from_numpy(np.concatenate(all_y_test, axis=0)).long()

    scaler.save(models_dir / "scalers.json")

    return {
        "X_train": X_train,
        "X_val":   X_val,
        "X_test":  X_test,
        "y_test":  y_test,
        "scaler":  scaler,
    }


# ── CLI entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("FlowGuard preprocessing pipeline")
    print(f"  window_size={WINDOW_SIZE} h  |  stride={STRIDE} h  |  "
          f"val_fraction={VAL_FRACTION}")
    print()
    splits = load_and_preprocess()

    print()
    headers = {
        "X_train": "Normal training windows",
        "X_val":   "Normal validation windows",
        "X_test":  "Test windows (mixed)",
        "y_test":  "Test anomaly labels",
    }
    for key, desc in headers.items():
        t = splits[key]
        print(f"  {key:<10}  shape={str(tuple(t.shape)):<20}  "
              f"dtype={t.dtype}   # {desc}")

    y = splits["y_test"]
    pos = int(y.sum())
    pct = 100.0 * pos / len(y)
    print(f"\n  Anomalous test windows : {pos} / {len(y)}  ({pct:.1f} %)")
    print(f"  Value range in X_train : "
          f"[{splits['X_train'].min():.4f}, {splits['X_train'].max():.4f}]")
    print(f"  Value range in X_test  : "
          f"[{splits['X_test'].min():.4f}, {splits['X_test'].max():.4f}]  "
          f"(may exceed 1.0 for leak windows)")
