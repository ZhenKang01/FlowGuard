#!/usr/bin/env python3
"""
src/train.py
============
Training loop for the FlowGuard LSTM autoencoder.

!! Training data is SYNTHETIC (see src/generate_data.py) !!

The model is trained ONLY on normal water-usage windows. At inference
time, windows whose pattern differs from what was seen in training will
produce high reconstruction error and be flagged as anomalies.

Algorithm
---------
  for epoch in 1 .. MAX_EPOCHS:
      train one pass over X_train, compute batch MSE, back-prop
      compute mean MSE on X_val (no grad)
      if val_loss improved by > MIN_DELTA  ->  save best checkpoint
      else                                 ->  increment patience counter
      if patience counter == PATIENCE      ->  stop early

Saves
-----
  models/autoencoder.pt     – best-checkpoint state dict
  models/train_config.json  – hyperparameters + training summary
  plots/training_loss.png   – train / val loss curve

Usage
-----
    python src/train.py
"""

import json
import sys
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Make sibling modules importable regardless of working directory
sys.path.insert(0, str(Path(__file__).parent))
from model import build_model                        # noqa: E402
from preprocess import load_and_preprocess           # noqa: E402

# ── Paths ─────────────────────────────────────────────────────────────────────
_ROOT      = Path(__file__).parent.parent
MODELS_DIR = _ROOT / "models"
PLOTS_DIR  = _ROOT / "plots"

# ── Hyperparameters ───────────────────────────────────────────────────────────
BATCH_SIZE    = 64
LEARNING_RATE = 1e-3
MAX_EPOCHS    = 50
PATIENCE      = 7        # stop if val loss does not improve for this many epochs
MIN_DELTA     = 1e-5     # minimum drop in val loss that counts as improvement
HIDDEN_SIZE   = 32
NUM_LAYERS    = 1
SEED          = 42


# ── One epoch helpers ─────────────────────────────────────────────────────────
def _train_epoch(
    model:     nn.Module,
    loader:    DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device:    torch.device,
) -> float:
    """Run one full training pass; return mean batch loss."""
    model.train()
    total_loss = 0.0
    for (x,) in loader:
        x = x.to(device)
        optimizer.zero_grad()
        loss = criterion(model(x), x)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(x)
    return total_loss / len(loader.dataset)


@torch.no_grad()
def _eval_epoch(
    model:     nn.Module,
    loader:    DataLoader,
    criterion: nn.Module,
    device:    torch.device,
) -> float:
    """Run validation pass; return mean loss (no gradient updates)."""
    model.eval()
    total_loss = 0.0
    for (x,) in loader:
        x = x.to(device)
        total_loss += criterion(model(x), x).item() * len(x)
    return total_loss / len(loader.dataset)


# ── Loss curve plot ───────────────────────────────────────────────────────────
def _plot_loss(
    train_losses: list,
    val_losses:   list,
    best_epoch:   int,
    stopped_at:   int,
    out_path:     Path,
) -> None:
    epochs = range(1, len(train_losses) + 1)

    fig, ax = plt.subplots(figsize=(9, 4))
    ax.plot(epochs, train_losses, lw=1.5, color="#3b82f6",
            label="Train MSE")
    ax.plot(epochs, val_losses,   lw=1.5, color="#f97316",
            label="Val MSE",  linestyle="--")

    # Mark best checkpoint
    ax.axvline(best_epoch, color="#10b981", lw=1.2, linestyle=":",
               label=f"Best checkpoint (epoch {best_epoch})")
    ax.scatter([best_epoch], [val_losses[best_epoch - 1]],
               color="#10b981", zorder=5, s=50)

    # Mark early-stop epoch if it differs from best
    if stopped_at != len(train_losses):
        ax.axvline(stopped_at, color="#ef4444", lw=1.0, linestyle=":",
                   label=f"Early stop (epoch {stopped_at})")

    ax.set_xlabel("Epoch")
    ax.set_ylabel("MSE Loss")
    ax.set_title(
        "FlowGuard LSTM Autoencoder – Training & Validation Loss\n"
        "[SYNTHETIC DATA]",
        fontsize=10,
    )
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=130, bbox_inches="tight")
    plt.close()
    print(f"  Loss curve saved -> {out_path}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    torch.manual_seed(SEED)
    np.random.seed(SEED)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device : {device}")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)

    # ── Data ──────────────────────────────────────────────────────────────────
    print("\nLoading & preprocessing data ...")
    splits = load_and_preprocess(models_dir=MODELS_DIR)
    X_train, X_val = splits["X_train"], splits["X_val"]
    print(f"  X_train : {tuple(X_train.shape)}")
    print(f"  X_val   : {tuple(X_val.shape)}")

    loader_train = DataLoader(
        TensorDataset(X_train),
        batch_size=BATCH_SIZE,
        shuffle=True,           # windows are i.i.d. once extracted
        drop_last=False,
    )
    loader_val = DataLoader(
        TensorDataset(X_val),
        batch_size=BATCH_SIZE,
        shuffle=False,
    )

    # ── Model, loss, optimiser ─────────────────────────────────────────────────
    model     = build_model(hidden_size=HIDDEN_SIZE, num_layers=NUM_LAYERS).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

    print(f"\nModel  : {model.n_parameters:,} trainable parameters")
    print(f"Epochs : up to {MAX_EPOCHS}  |  patience {PATIENCE}  |  "
          f"lr {LEARNING_RATE}  |  batch {BATCH_SIZE}")

    # ── Training loop ─────────────────────────────────────────────────────────
    train_losses, val_losses = [], []
    best_val_loss   = float("inf")
    best_epoch      = 1
    best_state_dict = None
    no_improve_cnt  = 0
    t0 = time.time()

    print()
    print(f"  {'Epoch':>5}  {'Train MSE':>10}  {'Val MSE':>10}  {'Status'}")
    print(f"  {'-'*50}")

    for epoch in range(1, MAX_EPOCHS + 1):
        tr_loss = _train_epoch(model, loader_train, optimizer, criterion, device)
        va_loss = _eval_epoch(model, loader_val, criterion, device)

        train_losses.append(tr_loss)
        val_losses.append(va_loss)

        # ── Early-stopping bookkeeping ─────────────────────────────────────
        if va_loss < best_val_loss - MIN_DELTA:
            best_val_loss   = va_loss
            best_epoch      = epoch
            no_improve_cnt  = 0
            # Deep-copy state dict so we keep the best weights, not the last
            best_state_dict = {k: v.cpu().clone()
                               for k, v in model.state_dict().items()}
            status = "* improved"
        else:
            no_improve_cnt += 1
            status = f"  ({no_improve_cnt}/{PATIENCE})"

        print(f"  {epoch:>5}  {tr_loss:>10.6f}  {va_loss:>10.6f}  {status}")

        if no_improve_cnt >= PATIENCE:
            print(f"\n  Early stop triggered after {epoch} epochs "
                  f"(no improvement for {PATIENCE} consecutive epochs).")
            break

    elapsed = time.time() - t0
    stopped_at = len(train_losses)

    # ── Restore best weights and save ─────────────────────────────────────────
    model.load_state_dict(best_state_dict)
    ckpt_path = MODELS_DIR / "autoencoder.pt"
    torch.save(best_state_dict, ckpt_path)
    print(f"\n  Best checkpoint (epoch {best_epoch}, "
          f"val MSE {best_val_loss:.6f}) saved -> {ckpt_path}")

    # ── Persist training config & summary ────────────────────────────────────
    config = {
        "hidden_size":    HIDDEN_SIZE,
        "num_layers":     NUM_LAYERS,
        "window_size":    24,
        "batch_size":     BATCH_SIZE,
        "learning_rate":  LEARNING_RATE,
        "max_epochs":     MAX_EPOCHS,
        "patience":       PATIENCE,
        "min_delta":      MIN_DELTA,
        "best_epoch":     best_epoch,
        "best_val_mse":   round(best_val_loss, 8),
        "epochs_trained": stopped_at,
        "train_seconds":  round(elapsed, 1),
        "n_parameters":   model.n_parameters,
    }
    cfg_path = MODELS_DIR / "train_config.json"
    with open(cfg_path, "w") as fh:
        json.dump(config, fh, indent=2)
    print(f"  Config saved           -> {cfg_path}")

    # ── Loss plot ─────────────────────────────────────────────────────────────
    _plot_loss(
        train_losses, val_losses,
        best_epoch=best_epoch,
        stopped_at=stopped_at,
        out_path=PLOTS_DIR / "training_loss.png",
    )

    print(f"\n  Training complete in {elapsed:.1f}s  |  "
          f"best val MSE = {best_val_loss:.6f}")


if __name__ == "__main__":
    main()
