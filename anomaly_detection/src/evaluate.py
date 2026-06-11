#!/usr/bin/env python3
"""
src/evaluate.py
===============
Threshold calibration and anomaly-detection evaluation for FlowGuard.

!! Data is SYNTHETIC (see src/generate_data.py) !!

Steps
-----
1. Load the trained model and reconstructed preprocessing splits
2. Score the *validation* set (all-normal windows) to calibrate thresholds
3. Compare two threshold strategies on the test set:
       A. 99th-percentile of validation reconstruction errors
       B. mean + 3 × std  of validation reconstruction errors
4. Report precision / recall / F1 and confusion matrix for each strategy;
   state which strategy performs better and why
5. Save plots/evaluation.png:
       top    – per-window reconstruction-error curve for one meter (test)
                with both threshold lines and true-anomaly shading
       bottom – raw consumption curve for the same meter with true anomaly
                regions shaded and model detections marked

Usage
-----
    python src/evaluate.py
"""

import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd
import torch
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

sys.path.insert(0, str(Path(__file__).parent))
from model import build_model                           # noqa: E402
from preprocess import (                                # noqa: E402
    MeterScaler,
    _make_windows,
    load_and_preprocess,
    WINDOW_SIZE,
    STRIDE,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
_ROOT      = Path(__file__).parent.parent
MODELS_DIR = _ROOT / "models"
DATA_DIR   = _ROOT / "data"
PLOTS_DIR  = _ROOT / "plots"

# Meter used for the per-meter diagnostic plots (most injected anomalies)
PLOT_METER = "meter_02"


# ── Scoring helper ────────────────────────────────────────────────────────────
@torch.no_grad()
def score_windows(model: torch.nn.Module,
                  X:     torch.Tensor,
                  batch: int = 512) -> np.ndarray:
    """
    Return per-window MSE reconstruction error as a numpy array.

    Parameters
    ----------
    model : trained LSTMAutoencoder (eval mode)
    X     : FloatTensor (N, seq_len, 1)
    batch : mini-batch size for scoring (avoids OOM on large tensors)

    Returns
    -------
    errors : float32 ndarray, shape (N,)
    """
    model.eval()
    parts = []
    for i in range(0, len(X), batch):
        chunk  = X[i : i + batch]
        x_hat  = model(chunk)
        mse    = ((chunk - x_hat) ** 2).mean(dim=(1, 2))
        parts.append(mse.numpy())
    return np.concatenate(parts)


# ── Threshold calibration ─────────────────────────────────────────────────────
def calibrate_thresholds(val_errors: np.ndarray) -> dict:
    """
    Derive two candidate anomaly thresholds from validation (normal) errors.

    Strategy A – 99th-percentile:
        Conservative upper tail of the normal-error distribution.
        Robust to non-Gaussian tails; no distributional assumption.

    Strategy B – mean + 3 × std:
        Classic control-chart 3-sigma rule; assumes roughly Gaussian errors.
        Slightly more lenient when the error distribution has a long right tail.

    Returns
    -------
    dict with keys 'p99' and 'mean3std'
    """
    return {
        "p99":      float(np.percentile(val_errors, 99)),
        "mean3std": float(val_errors.mean() + 3 * val_errors.std()),
    }


# ── Metrics helper ────────────────────────────────────────────────────────────
def compute_metrics(y_true: np.ndarray,
                    y_pred: np.ndarray,
                    label:  str) -> dict:
    """Compute and pretty-print precision / recall / F1 + confusion matrix."""
    p  = precision_score(y_true, y_pred, zero_division=0)
    r  = recall_score   (y_true, y_pred, zero_division=0)
    f1 = f1_score       (y_true, y_pred, zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    print(f"\n  Strategy {label}")
    print(f"    Precision : {p:.4f}")
    print(f"    Recall    : {r:.4f}")
    print(f"    F1        : {f1:.4f}")
    print(f"    TP={tp}  FP={fp}  FN={fn}  TN={tn}")
    return dict(precision=p, recall=r, f1=f1, tp=int(tp), fp=int(fp),
                fn=int(fn), tn=int(tn))


# ── Per-meter diagnostic data ──────────────────────────────────────────────────
def _get_meter_test_data(meter_id: str, scaler: MeterScaler):
    """
    Rebuild windows and raw series for a single meter's test block.
    Returns:
        windows        FloatTensor (N, 24, 1) – normalised
        win_labels     int array   (N,)       – true anomaly flags
        raw_series     pd.Series              – original L/hr, timestamp index
        label_series   pd.Series              – is_anomaly, timestamp index
    """
    df = pd.read_csv(DATA_DIR / "test_anomalies.csv",
                     parse_dates=["timestamp"])
    sub = df[df["meter_id"] == meter_id].set_index("timestamp").sort_index()

    raw_series   = sub["consumption_L"]
    label_series = sub["is_anomaly"].astype(int)

    scaled = scaler.transform(meter_id, raw_series.values)
    wins, labs = _make_windows(scaled,
                               labels=label_series.values,
                               window_size=WINDOW_SIZE,
                               stride=STRIDE)
    return torch.from_numpy(wins), labs, raw_series, label_series


# ── Evaluation plot ───────────────────────────────────────────────────────────
def _plot_evaluation(meter_id:   str,
                     errors:     np.ndarray,
                     win_labels: np.ndarray,
                     pred_p99:   np.ndarray,
                     pred_3std:  np.ndarray,
                     thr_p99:    float,
                     thr_3std:   float,
                     raw_series: pd.Series,
                     label_series: pd.Series,
                     out_path:   Path) -> None:
    """
    Two-panel evaluation figure for one meter.

    Top   : per-window reconstruction-error curve with threshold lines
            and true-anomaly regions shaded
    Bottom: raw hourly consumption curve with true-anomaly shading
            and model detections (union of both strategies) marked
    """
    fig, axes = plt.subplots(2, 1, figsize=(14, 8), sharex=False)
    fig.suptitle(
        f"{meter_id}  –  FlowGuard Anomaly Detection Evaluation\n"
        "[SYNTHETIC DATA]",
        fontsize=10, y=1.01,
    )

    n_wins = len(errors)
    x_wins = np.arange(n_wins)   # window index ≈ hour offset in test block

    # ── Top panel: error curve ────────────────────────────────────────────────
    ax = axes[0]
    ax.plot(x_wins, errors, lw=0.8, color="#3b82f6", alpha=0.85,
            label="Reconstruction MSE")

    # Shade true-anomaly window regions
    anom_mask = win_labels.astype(bool)
    if anom_mask.any():
        ax.fill_between(x_wins, 0, errors.max() * 1.1,
                        where=anom_mask, color="#ef4444", alpha=0.15,
                        label="True anomaly window")

    # Threshold lines
    ax.axhline(thr_p99,   color="#dc2626", lw=1.2, linestyle="--",
               label=f"Threshold 99th pct  ({thr_p99:.5f})")
    ax.axhline(thr_3std,  color="#ea580c", lw=1.2, linestyle="-.",
               label=f"Threshold mean+3std ({thr_3std:.5f})")

    # Mark predictions (scatter on top)
    ax.scatter(x_wins[pred_p99.astype(bool)], errors[pred_p99.astype(bool)],
               s=8, color="#dc2626", zorder=4, alpha=0.7, label="Flagged (99th pct)")

    ax.set_ylabel("MSE reconstruction error", fontsize=8)
    ax.set_xlabel("Window index (= test hour offset)", fontsize=8)
    ax.legend(fontsize=7, loc="upper right")
    ax.grid(True, alpha=0.25, lw=0.5)
    ax.set_xlim(0, n_wins)

    # ── Bottom panel: raw consumption ─────────────────────────────────────────
    ax = axes[1]
    ts  = raw_series.index
    ax.plot(ts, raw_series.values, lw=0.8, color="#475569",
            alpha=0.85, label="Consumption")

    # True anomaly shading
    true_anom = label_series.astype(bool)
    if true_anom.any():
        ax.fill_between(ts, 0, raw_series.max() * 1.1,
                        where=true_anom.values,
                        color="#ef4444", alpha=0.20, label="True anomaly")

    # Predicted detections: map window predictions back to the window's centre hour
    # Union of both strategies so we can see all model decisions
    pred_union = (pred_p99 | pred_3std).astype(bool)
    # Each window i covers raw_series hours [i, i+WINDOW_SIZE-1]; centre = i+12
    detected_centres = [i + WINDOW_SIZE // 2
                        for i, flag in enumerate(pred_union) if flag
                        if i + WINDOW_SIZE // 2 < len(ts)]
    if detected_centres:
        det_ts  = ts[detected_centres]
        det_val = raw_series.iloc[detected_centres].values
        ax.scatter(det_ts, det_val, s=10, color="#f97316", zorder=4,
                   alpha=0.7, label="Detected (either strategy)")

    ax.set_ylabel("Consumption  (L / hr)", fontsize=8)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d %b"))
    ax.xaxis.set_major_locator(mdates.DayLocator(interval=3))
    ax.tick_params(axis="x", labelsize=7, rotation=30)
    ax.legend(fontsize=7, loc="upper right")
    ax.grid(True, alpha=0.25, lw=0.5)

    plt.tight_layout()
    plt.savefig(out_path, dpi=130, bbox_inches="tight")
    plt.close()
    print(f"\n  Evaluation plot saved -> {out_path}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    PLOTS_DIR.mkdir(exist_ok=True)

    # ── Load model ────────────────────────────────────────────────────────────
    cfg_path = MODELS_DIR / "train_config.json"
    with open(cfg_path) as fh:
        cfg = json.load(fh)

    model = build_model(hidden_size=cfg["hidden_size"],
                        num_layers=cfg["num_layers"])
    model.load_state_dict(
        torch.load(MODELS_DIR / "autoencoder.pt", map_location="cpu",
                   weights_only=True)
    )
    model.eval()
    print(f"Loaded model  (epoch {cfg['best_epoch']}, "
          f"val MSE {cfg['best_val_mse']:.6f})")

    # ── Load preprocessed splits ──────────────────────────────────────────────
    print("Preprocessing data ...")
    splits  = load_and_preprocess(models_dir=MODELS_DIR)
    X_val   = splits["X_val"]
    X_test  = splits["X_test"]
    y_test  = splits["y_test"].numpy()
    scaler  = splits["scaler"]

    # ── Score validation set → calibrate thresholds ───────────────────────────
    print("\nScoring validation set (normal only) ...")
    val_errors = score_windows(model, X_val)
    print(f"  Val errors  – mean={val_errors.mean():.6f}  "
          f"std={val_errors.std():.6f}  "
          f"p99={np.percentile(val_errors, 99):.6f}")

    thresholds = calibrate_thresholds(val_errors)
    thr_p99    = thresholds["p99"]
    thr_3std   = thresholds["mean3std"]
    print(f"\n  Threshold A  (99th-percentile) : {thr_p99:.6f}")
    print(f"  Threshold B  (mean + 3 × std)  : {thr_3std:.6f}")

    # ── Score test set → predict ──────────────────────────────────────────────
    print("\nScoring test set ...")
    test_errors = score_windows(model, X_test)

    pred_p99   = (test_errors >= thr_p99).astype(int)
    pred_3std  = (test_errors >= thr_3std).astype(int)

    pos_total = int(y_test.sum())
    print(f"  True anomaly windows : {pos_total} / {len(y_test)}")
    print(f"  Flagged by A         : {pred_p99.sum()}")
    print(f"  Flagged by B         : {pred_3std.sum()}")

    # ── Metrics ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("  EVALUATION RESULTS")
    print("=" * 50)

    metrics_a = compute_metrics(y_test, pred_p99,  "A – 99th-percentile")
    metrics_b = compute_metrics(y_test, pred_3std, "B – mean + 3 × std ")

    # ── Winner ────────────────────────────────────────────────────────────────
    print("\n" + "-" * 50)
    if metrics_a["f1"] >= metrics_b["f1"]:
        winner, loser = "A (99th-percentile)", "B (mean+3std)"
        win_f1, los_f1 = metrics_a["f1"], metrics_b["f1"]
        best_threshold = thr_p99
    else:
        winner, loser = "B (mean+3std)", "A (99th-percentile)"
        win_f1, los_f1 = metrics_b["f1"], metrics_a["f1"]
        best_threshold = thr_3std

    print(f"\n  RECOMMENDED STRATEGY: {winner}")
    print(f"  F1 = {win_f1:.4f}  vs  {loser}  F1 = {los_f1:.4f}")
    print(
        f"\n  Reasoning:\n"
        f"    The 99th-percentile threshold is distribution-free and robust\n"
        f"    to heavy-tailed error distributions common in real sensor data.\n"
        f"    The mean+3std rule is tighter when errors are near-Gaussian but\n"
        f"    can be too permissive when the normal distribution has a long tail.\n"
        f"    On this synthetic dataset the winner is {winner}."
    )
    print("-" * 50)

    # ── Save threshold recommendation ─────────────────────────────────────────
    result = {
        "threshold_p99":    thr_p99,
        "threshold_mean3std": thr_3std,
        "recommended":      "p99" if "99th" in winner else "mean3std",
        "best_threshold":   best_threshold,
        "metrics_p99":      metrics_a,
        "metrics_mean3std": metrics_b,
    }
    out_json = MODELS_DIR / "eval_results.json"
    with open(out_json, "w") as fh:
        json.dump(result, fh, indent=2)
    print(f"\n  Results saved -> {out_json}")

    # ── Per-meter diagnostic plot (PLOT_METER) ────────────────────────────────
    print(f"\nBuilding diagnostic plot for {PLOT_METER} ...")
    (m_wins, m_labs,
     raw_series, label_series) = _get_meter_test_data(PLOT_METER, scaler)

    m_errors   = score_windows(model, m_wins)
    m_pred_p99  = (m_errors >= thr_p99).astype(int)
    m_pred_3std = (m_errors >= thr_3std).astype(int)

    _plot_evaluation(
        meter_id     = PLOT_METER,
        errors       = m_errors,
        win_labels   = m_labs,
        pred_p99     = m_pred_p99,
        pred_3std    = m_pred_3std,
        thr_p99      = thr_p99,
        thr_3std     = thr_3std,
        raw_series   = raw_series,
        label_series = label_series,
        out_path     = PLOTS_DIR / "evaluation.png",
    )


if __name__ == "__main__":
    main()
