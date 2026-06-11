# FlowGuard — Anomaly Detection Module

LSTM autoencoder that scores 24-hour water-usage windows for leaks and sensor
faults. Trained on **synthetic data** (hackathon build — do not use thresholds
in production without retraining on real sensor history).

Person E's component. Integrates with the React dashboard via a FastAPI JSON
endpoint on port 8000.

---

## Prerequisites

- Python 3.11+
- Windows: the venv is at `.venv/` inside this directory

```
cd anomaly_detection
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
```

If the venv is missing, recreate it:

```
python -m venv .venv
.venv\Scripts\activate
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org \
    -r requirements.txt
```

---

## Running the pipeline (in order)

Each script is self-contained. Run from the `anomaly_detection/` directory with
the venv active.

### 1. Generate synthetic data

```
python src/generate_data.py
```

Outputs:
- `data/train_normal.csv` — 8,400 rows, 5 meters × 70 days, no anomalies
- `data/test_anomalies.csv` — 2,400 rows, 5 meters × 20 days, 145 anomaly hours
- `plots/meter_00_overview.png` — visual sanity check

### 2. Preprocess

```
python src/preprocess.py
```

Fits per-meter Min-Max scalers on the training data, builds 24-hour sliding
windows (stride = 1), and splits train/val 80/20 (temporal, no shuffle).

Outputs:
- `models/scalers.json` — `{meter_id: [min, max]}` for each meter

### 3. Train

```
python src/train.py
```

Trains the LSTM autoencoder on normal windows only. Stops early when validation
loss stops improving (patience = 7 epochs). Expected runtime: ~30 s on CPU.

Outputs:
- `models/autoencoder.pt` — best-checkpoint state dict
- `models/train_config.json` — hyperparameters and training summary
- `plots/training_loss.png` — train / val loss curve

### 4. Evaluate

```
python src/evaluate.py
```

Calibrates the anomaly threshold against the validation set (99th-percentile
of normal reconstruction errors), then scores the test set.

Expected results: Precision ≈ 0.97, Recall ≈ 0.63, F1 ≈ 0.76.

Outputs:
- `models/eval_results.json` — thresholds, metrics, recommended strategy
- `plots/evaluation.png` — error curve + raw consumption with anomaly shading

### 5. Smoke-test inference

```
python src/inference.py
```

Verifies the four artefact files load correctly and prints scores for a normal
window, a simulated 400 L/hr leak, a flatline, and a bad-meter-id guard.

### 6. Start the API

```
python src/api.py
```

Server starts on `http://0.0.0.0:8000`. Interactive docs at
`http://localhost:8000/docs`.

---

## API contract

### POST /score

Score one 24-hour window for a single meter.

**Request**

```
Content-Type: application/json

{
  "meter_id" : "meter_02",
  "readings" : [5.2, 3.1, 2.8, ..., 6.7]
}
```

| Field | Type | Constraints |
|---|---|---|
| `meter_id` | string | one of `meter_00` … `meter_04` |
| `readings` | array of float | exactly 24 values, each >= 0, in L/hr, oldest first |

**Response 200**

```json
{
  "meter_id"  : "meter_02",
  "anomaly"   : true,
  "score"     : 0.03124567,
  "threshold" : 0.00491800,
  "n_readings": 24
}
```

| Field | Type | Meaning |
|---|---|---|
| `anomaly` | bool | `true` → flag this window for investigation |
| `score` | float | MSE reconstruction error — higher = more unusual |
| `threshold` | float | calibrated threshold from `models/eval_results.json` |
| `n_readings` | int | always 24 |

**Error responses**

| Status | When | Body |
|---|---|---|
| 400 | Unknown `meter_id` | `{"detail": "Unknown meter_id 'meter_99'. Valid meters: [...]"}` |
| 400 | Wrong reading count | `{"detail": "Expected exactly 24 readings, got 10."}` |
| 400 | Negative reading | `{"detail": "All readings must be >= 0 (L/hr cannot be negative)."}` |
| 422 | Wrong types / missing fields | Pydantic validation detail |
| 503 | Pipeline not yet run | `{"detail": "Model not loaded. Run the pipeline first."}` |

---

### GET /health

Liveness check. Always returns 200.

```json
{"status": "ok", "model_loaded": true}
```

Use `model_loaded: false` to detect that the pipeline has not been run yet.

---

### GET /meters

List the meter IDs this instance accepts.

```json
{"meter_ids": ["meter_00", "meter_01", "meter_02", "meter_03", "meter_04"]}
```

---

## Python integration (no HTTP)

If you call from within the same process (e.g., a background worker):

```python
from src.inference import score_window

result = score_window("meter_02", readings)   # readings: list of 24 floats
if result["anomaly"]:
    trigger_alert(result)
```

`score_window` raises `ValueError` for an unknown meter ID or wrong count, and
`RuntimeError` if the artefact files are missing.

---

## Quick curl reference

```bash
# Health
curl http://localhost:8000/health

# List meters
curl http://localhost:8000/meters

# Score a normal window
curl -X POST http://localhost:8000/score \
     -H "Content-Type: application/json" \
     -d '{"meter_id":"meter_00","readings":[30,28,25,22,20,19,18,22,55,80,85,82,78,75,80,83,79,65,50,40,35,30,28,25]}'

# Score a leak (sustained high draw)
curl -X POST http://localhost:8000/score \
     -H "Content-Type: application/json" \
     -d '{"meter_id":"meter_00","readings":[400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400]}'
```

---

## Known limitations

- **Flatline sensor failure at low values** — readings stuck near 0–2 L/hr are
  not reliably flagged because overnight normal consumption is also near zero.
  The autoencoder cannot distinguish "broken sensor" from "building asleep".
  Complement with a rule-based floor check (e.g., flag any 24-hour window where
  variance < 0.1 and mean < 5 L/hr).

- **Trained on synthetic data** — thresholds and precision/recall figures are
  only valid against the synthetic test set. Retrain on 60+ days of real meter
  history before deploying.

- **No GPU required** — model runs on CPU in ~1 ms per window.

---

## File layout

```
anomaly_detection/
  src/
    generate_data.py   step 1 — synthetic data generation
    preprocess.py      step 2 — scaling + windowing
    model.py           LSTM autoencoder architecture
    train.py           step 3 — training loop
    evaluate.py        step 4 — threshold calibration + metrics
    inference.py       step 5 — inference interface (Python API)
    api.py             step 6 — FastAPI JSON endpoint
  data/
    train_normal.csv
    test_anomalies.csv
  models/
    scalers.json
    autoencoder.pt
    train_config.json
    eval_results.json
  plots/
    meter_00_overview.png
    training_loss.png
    evaluation.png
  requirements.txt
  README.md
```
