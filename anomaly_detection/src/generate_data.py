#!/usr/bin/env python3
"""
src/generate_data.py
====================
Synthetic commercial water-usage time-series generator for FlowGuard.

!! ALL DATA PRODUCED HERE IS FULLY SYNTHETIC !!
Patterns are designed to be plausible for a multi-building commercial
facility but are generated entirely by statistical simulation.
No real sensor readings are used anywhere in this file.

Outputs
-------
data/train_normal.csv    – 70 days, 5 meters, clean (label-free)
data/test_anomalies.csv  – 20 days, 5 meters, with is_anomaly column
plots/meter_00_overview.png – visual sanity-check for one meter

Usage
-----
    python src/generate_data.py
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")          # headless – no display required
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.patches as mpatches
from pathlib import Path

# --Reproducibility --─────────────────────────────────────────────────────────
SEED = 42
rng  = np.random.default_rng(SEED)

# --Dataset dimensions --──────────────────────────────────────────────────────
N_METERS    = 5
DAYS_TRAIN  = 70          # normal-only training block
DAYS_TEST   = 20          # test block (anomalies injected here)
START_DATE  = pd.Timestamp("2024-01-01 00:00:00")

# Per-meter peak consumption (L/hr) – models buildings of different sizes
METER_BASELINES  = np.array([100.0, 75.0, 130.0, 90.0, 110.0])

# Noise level: std as a fraction of the local instantaneous signal value
METER_NOISE_FRAC = np.array([0.08, 0.10, 0.07, 0.12, 0.09])

# Weekend usage factor (<1): commercial buildings are quieter on weekends
WEEKEND_FACTORS  = rng.uniform(0.40, 0.65, size=N_METERS)


# --Daily profile --───────────────────────────────────────────────────────────
def _build_daily_profile() -> np.ndarray:
    """
    Compute a 24-element array (hour 0-23) of usage multipliers in [0.05, 1.0].

    Shape: two overlapping Gaussian humps mimicking a commercial building:
      - Morning  peak  ~09:00 (staff arrival, cleaning, catering)
      - Afternoon peak ~15:00 (sustained usage, slightly lower)
      - Near-zero overnight (00:00 – 05:00)
    """
    h           = np.arange(24, dtype=float)
    morning     = np.exp(-0.5 * ((h -  9) / 2.8) ** 2)
    afternoon   = np.exp(-0.5 * ((h - 15) / 2.4) ** 2) * 0.80
    raw         = morning + afternoon
    lo, hi      = raw.min(), raw.max()
    return 0.05 + 0.95 * (raw - lo) / (hi - lo)   # normalise to [0.05, 1.0]


DAILY_PROFILE = _build_daily_profile()   # shape: (24,)


# --Seasonal drift --──────────────────────────────────────────────────────────
def _seasonal_mult(timestamps: pd.DatetimeIndex) -> np.ndarray:
    """
    Sinusoidal seasonal multiplier (±12 %, 365-day period).
    Represents mild seasonal variation in facility water demand.
    """
    doy = np.asarray(timestamps.dayofyear, dtype=float)
    return 1.0 + 0.12 * np.sin(2 * np.pi * doy / 365.0)


# --Normal signal generator --─────────────────────────────────────────────────
def generate_normal_series(meter_idx: int,
                            timestamps: pd.DatetimeIndex) -> np.ndarray:
    """
    Return hourly consumption values (L/hr) for one meter under normal
    operating conditions (no anomalies).

    Signal = baseline × daily_profile × weekday_factor × seasonal_drift + noise

    Parameters
    ----------
    meter_idx  : int  – index into METER_BASELINES / METER_NOISE_FRAC arrays
    timestamps : pd.DatetimeIndex – one entry per hour

    Returns
    -------
    np.ndarray of shape (len(timestamps),), dtype float64, values ≥ 0
    """
    baseline    = METER_BASELINES[meter_idx]
    noise_frac  = METER_NOISE_FRAC[meter_idx]
    wknd_factor = WEEKEND_FACTORS[meter_idx]

    # Hour-of-day multiplier
    hour_mult   = DAILY_PROFILE[np.asarray(timestamps.hour)]

    # Day-type multiplier (Mon-Fri = 1.0, Sat-Sun = wknd_factor)
    is_weekend  = (np.asarray(timestamps.dayofweek) >= 5).astype(float)
    day_mult    = 1.0 - (1.0 - wknd_factor) * is_weekend

    # Seasonal drift
    season_mult = _seasonal_mult(timestamps)

    # Deterministic signal
    signal      = baseline * hour_mult * day_mult * season_mult

    # Heteroscedastic noise: std proportional to local signal level
    noise       = rng.normal(0.0, noise_frac * signal)

    return np.clip(signal + noise, 0.0, None)   # physical constraint: L/hr ≥ 0


# --Anomaly injection --───────────────────────────────────────────────────────
# Format: (meter_idx, start_hour_within_test_block, duration_hours, anomaly_type)
#
# "leak"     – sustained step-increase (pipe rupture, stuck valve)
# "flatline" – signal collapses to a near-constant value (sensor failure)
# "spike"    – short intense burst (burst main, sudden high draw)
ANOMALY_SPECS = [
    (0,  50,  36, "leak"),       # Building 0: 36-hr pipe leak
    (1, 120,  18, "flatline"),   # Building 1: 18-hr sensor blackout
    (2, 200,   3, "spike"),      # Building 2:  3-hr transient spike
    (2, 310,  48, "leak"),       # Building 2: 48-hr sustained high draw
    (3,  80,   4, "spike"),      # Building 3:  4-hr spike
    (4, 160,  24, "flatline"),   # Building 4: 24-hr sensor failure
    (4, 400,  12, "leak"),       # Building 4: 12-hr leak near end of window
]


def inject_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    """
    Overwrite specific windows in the test DataFrame with anomaly patterns
    and set is_anomaly=1 for those rows.  All other rows keep is_anomaly=0.

    Parameters
    ----------
    df : pd.DataFrame  – test-block data with columns
         [timestamp, meter_id, consumption_L]

    Returns
    -------
    pd.DataFrame with an added 'is_anomaly' column (int, 0 or 1)
    """
    df = df.copy()
    df["is_anomaly"] = 0

    for meter_idx, start_h, dur_h, a_type in ANOMALY_SPECS:
        meter_id    = f"meter_{meter_idx:02d}"
        mask_meter  = df["meter_id"] == meter_id

        # Ordered timestamp array for this meter
        all_ts  = df.loc[mask_meter, "timestamp"].values
        end_h   = min(start_h + dur_h, len(all_ts))
        if start_h >= len(all_ts):
            continue                              # spec out of range – skip
        target_ts   = all_ts[start_h:end_h]
        mask_window = mask_meter & df["timestamp"].isin(target_ts)

        if a_type == "leak":
            # Sustained elevated draw: ×1.5 – ×2.2 above normal
            mult = rng.uniform(1.5, 2.2)
            df.loc[mask_window, "consumption_L"] *= mult

        elif a_type == "flatline":
            # Sensor stuck reporting a near-zero constant
            flat_val = rng.uniform(0.5, 2.0)
            df.loc[mask_window, "consumption_L"] = flat_val

        elif a_type == "spike":
            # Brief intense burst: ×3 – ×5 above normal
            mult = rng.uniform(3.0, 5.0)
            df.loc[mask_window, "consumption_L"] *= mult

        df.loc[mask_window, "is_anomaly"] = 1

    return df


# --Plot --────────────────────────────────────────────────────────────────────
def _plot_meter_overview(df_train: pd.DataFrame,
                          df_test:  pd.DataFrame,
                          meter_id: str,
                          out_dir:  Path) -> None:
    """
    Two-panel plot for one meter:
      top    – training block (normal signal)
      bottom – test block with anomaly windows shaded red
    """
    tr = (df_train[df_train["meter_id"] == meter_id]
          .set_index("timestamp").sort_index())
    te = (df_test[df_test["meter_id"] == meter_id]
          .set_index("timestamp").sort_index())

    fig, axes = plt.subplots(2, 1, figsize=(14, 7), sharex=False)
    fig.suptitle(
        f"{meter_id}  –  Synthetic hourly water consumption overview\n"
        "[SYNTHETIC DATA — FlowGuard hackathon prototype]",
        fontsize=10, y=1.01
    )

    # --Top: training --───────────────────────────────────────────────────────
    ax = axes[0]
    ax.plot(tr.index, tr["consumption_L"],
            lw=0.6, color="#3b82f6", alpha=0.85)
    ax.set_title(f"Training block — {DAYS_TRAIN} days, normal only", fontsize=9)
    ax.set_ylabel("Consumption  (L / hr)", fontsize=8)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d %b"))
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=0, interval=2))
    ax.tick_params(axis="x", labelsize=7, rotation=30)
    ax.grid(True, alpha=0.25, lw=0.5)

    # --Bottom: test --────────────────────────────────────────────────────────
    ax = axes[1]
    ax.plot(te.index, te["consumption_L"],
            lw=0.7, color="#475569", alpha=0.85, label="Normal")

    anom = te["is_anomaly"].astype(bool)
    if anom.any():
        y_top = te["consumption_L"].max() * 1.08
        ax.fill_between(te.index, 0, y_top,
                         where=anom.values,
                         color="#ef4444", alpha=0.20,
                         label="Anomaly window")
        ax.scatter(te.index[anom], te.loc[anom, "consumption_L"],
                   s=4, color="#ef4444", alpha=0.7, zorder=3)

    ax.set_title(f"Test block — {DAYS_TEST} days, anomalies injected", fontsize=9)
    ax.set_ylabel("Consumption  (L / hr)", fontsize=8)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d %b"))
    ax.xaxis.set_major_locator(mdates.DayLocator(interval=3))
    ax.tick_params(axis="x", labelsize=7, rotation=30)
    ax.legend(fontsize=8, loc="upper right")
    ax.grid(True, alpha=0.25, lw=0.5)

    plt.tight_layout()
    out_path = out_dir / "meter_00_overview.png"
    plt.savefig(out_path, dpi=130, bbox_inches="tight")
    plt.close()


# --Entry point --─────────────────────────────────────────────────────────────
def main() -> None:
    root      = Path(__file__).parent.parent
    data_dir  = root / "data"
    plots_dir = root / "plots"
    data_dir.mkdir(exist_ok=True)
    plots_dir.mkdir(exist_ok=True)

    total_hours   = (DAYS_TRAIN + DAYS_TEST) * 24
    timestamps    = pd.date_range(START_DATE, periods=total_hours, freq="h")
    train_cut     = DAYS_TRAIN * 24       # first index of test block

    records_train, records_test = [], []

    for m_idx in range(N_METERS):
        meter_id = f"meter_{m_idx:02d}"
        values   = generate_normal_series(m_idx, timestamps)

        for i, ts in enumerate(timestamps):
            row = {"timestamp": ts, "meter_id": meter_id,
                   "consumption_L": round(float(values[i]), 4)}
            (records_train if i < train_cut else records_test).append(row)

    df_train = pd.DataFrame(records_train)
    df_test  = inject_anomalies(pd.DataFrame(records_test))

    # --Save --────────────────────────────────────────────────────────────────
    train_path = data_dir / "train_normal.csv"
    test_path  = data_dir / "test_anomalies.csv"
    df_train.to_csv(train_path, index=False)
    df_test.to_csv(test_path,   index=False)
    print(f"Saved  {train_path}   ({len(df_train):,} rows)")
    print(f"Saved  {test_path}    ({len(df_test):,} rows)")

    # Summary stats
    sep = "-" * 60
    print(f"\n{sep}\nTrain set (normal only)\n{sep}")
    print(df_train.groupby("meter_id")["consumption_L"]
          .describe().round(2).to_string())

    print(f"\n{sep}\nTest set\n{sep}")
    print(f"Total anomaly hours : {int(df_test['is_anomaly'].sum())}")
    print("Per-meter anomaly hours:")
    print(df_test.groupby("meter_id")["is_anomaly"].sum()
          .astype(int).to_string())

    # Plot
    _plot_meter_overview(df_train, df_test, "meter_00", plots_dir)
    print(f"\nPlot saved -> {plots_dir / 'meter_00_overview.png'}")


if __name__ == "__main__":
    main()
