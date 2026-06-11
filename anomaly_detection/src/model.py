#!/usr/bin/env python3
"""
src/model.py
============
LSTM Autoencoder for unsupervised anomaly detection in
commercial water-usage time series (FlowGuard hackathon).

!! The model is trained on SYNTHETIC data (see src/generate_data.py) !!

Architecture
------------

  Input (B, 24, 1)
        |
        v
  ┌─────────────────────────────────────────┐
  │  ENCODER                                │
  │  LSTM(input=1, hidden=H, layers=L)      │
  │  – processes full 24-step window        │
  │  – discards per-step outputs            │
  │  – keeps final hidden state h_n, c_n    │
  └────────────────┬────────────────────────┘
                   │  latent code: h_n[-1]  (B, H)
                   v
  ┌─────────────────────────────────────────┐
  │  BOTTLENECK                             │
  │  Repeat h_n[-1] → (B, 24, H)           │
  │  (decoder input at every time step)     │
  └────────────────┬────────────────────────┘
                   │
                   v
  ┌─────────────────────────────────────────┐
  │  DECODER                                │
  │  LSTM(input=H, hidden=H, layers=L)      │
  │  – initial state = encoder (h_n, c_n)  │
  │  – output: (B, 24, H)                  │
  └────────────────┬────────────────────────┘
                   │
                   v
  Linear(H → 1)  →  Reconstruction (B, 24, 1)

Anomaly score = MSE(input, reconstruction).
Normal patterns reconstruct well (low score).
Unseen anomalous patterns reconstruct poorly (high score).

Default (H=32, L=1): ~12 700 trainable parameters.
Runs on CPU in <1 ms per window – suitable for real-time scoring.
"""

import torch
import torch.nn as nn

__all__ = ["LSTMAutoencoder", "build_model"]


class LSTMAutoencoder(nn.Module):
    """
    Sequence-to-sequence LSTM autoencoder for univariate time-series windows.

    Parameters
    ----------
    input_size  : int  – features per time step (1 for univariate consumption)
    hidden_size : int  – LSTM hidden dimension; controls model capacity
    num_layers  : int  – stacked LSTM layers (1 is fast; 2 adds capacity)
    """

    def __init__(
        self,
        input_size:  int = 1,
        hidden_size: int = 32,
        num_layers:  int = 1,
    ) -> None:
        super().__init__()
        self.input_size  = input_size
        self.hidden_size = hidden_size
        self.num_layers  = num_layers

        # ── Encoder ───────────────────────────────────────────────────────────
        # Reads the raw window left-to-right and compresses it into h_n.
        self.encoder_lstm = nn.LSTM(
            input_size  = input_size,
            hidden_size = hidden_size,
            num_layers  = num_layers,
            batch_first = True,    # tensors are (batch, seq, feature)
        )

        # ── Decoder ───────────────────────────────────────────────────────────
        # Input at every step is the latent vector (no teacher forcing).
        # Single-pass inference: no autoregressive loop at inference time.
        self.decoder_lstm = nn.LSTM(
            input_size  = hidden_size,   # latent vector dimension
            hidden_size = hidden_size,
            num_layers  = num_layers,
            batch_first = True,
        )

        # ── Output projection ─────────────────────────────────────────────────
        # Map each decoder hidden state back to the original feature dimension.
        self.output_proj = nn.Linear(hidden_size, input_size)

    # ── Core forward pass ─────────────────────────────────────────────────────
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Encode the input window, then decode to a reconstruction.

        Parameters
        ----------
        x : (batch, seq_len, input_size)  – normalised window tensor

        Returns
        -------
        reconstruction : same shape as x
        """
        batch_size, seq_len, _ = x.shape

        # ── Encode ────────────────────────────────────────────────────────────
        # We pass the full window to the encoder and discard all per-step
        # outputs.  Only the final hidden (h_n) and cell (c_n) states survive
        # as the bottleneck representation.
        _, (h_n, c_n) = self.encoder_lstm(x)
        # h_n : (num_layers, batch, hidden_size)
        # c_n : (num_layers, batch, hidden_size)

        # ── Latent vector ─────────────────────────────────────────────────────
        # Use the topmost layer's hidden state as the window's "fingerprint".
        latent = h_n[-1]   # (batch, hidden_size)

        # ── Decode ────────────────────────────────────────────────────────────
        # Tile the latent vector along the time axis so the decoder receives
        # the same compressed context at every reconstruction step.
        # Initialising the decoder with (h_n, c_n) lets context flow through
        # both the repeated input AND the LSTM state.
        dec_input = latent.unsqueeze(1).expand(-1, seq_len, -1)
        # (batch, seq_len, hidden_size)

        dec_out, _ = self.decoder_lstm(dec_input, (h_n, c_n))
        # (batch, seq_len, hidden_size)

        # ── Reconstruct ───────────────────────────────────────────────────────
        return self.output_proj(dec_out)   # (batch, seq_len, input_size)

    # ── Convenience utilities ─────────────────────────────────────────────────
    def reconstruction_error(self, x: torch.Tensor) -> torch.Tensor:
        """
        Per-window MSE between input and reconstruction (no gradient).

        Higher score → less familiar pattern → more likely anomalous.

        Parameters
        ----------
        x : (batch, seq_len, input_size)

        Returns
        -------
        errors : (batch,)  – one float score per window
        """
        with torch.no_grad():
            x_hat  = self(x)
            errors = ((x - x_hat) ** 2).mean(dim=(1, 2))   # mean over time & features
        return errors

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """
        Return the latent code for each window (encoder half only).

        Useful for scatter-plotting normal vs anomalous clusters in 2-D
        after dimensionality reduction.

        Returns
        -------
        latent : (batch, hidden_size)
        """
        with torch.no_grad():
            _, (h_n, _) = self.encoder_lstm(x)
        return h_n[-1]

    @property
    def n_parameters(self) -> int:
        """Total number of trainable scalar parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


# ── Factory ───────────────────────────────────────────────────────────────────
def build_model(hidden_size: int = 32, num_layers: int = 1) -> LSTMAutoencoder:
    """
    Construct the standard FlowGuard autoencoder.

    Called identically from train.py, evaluate.py, and inference.py so that
    all three scripts always instantiate the same architecture.

    Parameters
    ----------
    hidden_size : int  – LSTM hidden units (32 default ≈ 12 700 params)
    num_layers  : int  – stacked layers (1 recommended for hackathon speed)
    """
    return LSTMAutoencoder(input_size=1,
                           hidden_size=hidden_size,
                           num_layers=num_layers)


# ── Self-test ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    torch.manual_seed(0)

    for hidden in (16, 32, 64):
        m     = build_model(hidden_size=hidden, num_layers=1)
        x     = torch.rand(8, 24, 1)          # batch=8, 24-h window, 1 feature
        x_hat = m(x)
        errs  = m.reconstruction_error(x)

        assert x.shape == x_hat.shape, "shape mismatch"
        assert errs.shape == (8,),     "error shape wrong"

        print(f"  hidden={hidden:>2}  params={m.n_parameters:>6,}  "
              f"output={tuple(x_hat.shape)}  "
              f"err range=[{errs.min():.4f}, {errs.max():.4f}]")

    print()
    # Print a layer-by-layer breakdown for the default config
    model = build_model()
    print(f"Default model (hidden=32, layers=1)")
    print(f"  {'Layer':<20} {'Params':>8}")
    print(f"  {'-'*30}")
    for name, param in model.named_parameters():
        print(f"  {name:<20} {param.numel():>8,}")
    print(f"  {'-'*30}")
    print(f"  {'TOTAL':<20} {model.n_parameters:>8,}")
