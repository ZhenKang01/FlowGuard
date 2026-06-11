# FlowGuard

**A B2B facility management platform for commercial properties to track water consumption, detect leaks in real time, and monitor sanitation supply levels — reducing utility costs, preventing property damage, and ensuring compliance with health regulations.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Web Application Setup](#web-application-setup)
   - [Anomaly Detection Module Setup](#anomaly-detection-module-setup)
6. [Authentication & Access Control](#authentication--access-control)
7. [Anomaly Detection Module](#anomaly-detection-module)
   - [Pipeline Overview](#pipeline-overview)
   - [Running the Pipeline](#running-the-pipeline)
   - [API Reference](#api-reference)
8. [Three-Layer Integration](#three-layer-integration)
   - [How the Layers Connect](#how-the-layers-connect)
   - [Local Run Sequence](#local-run-sequence)
   - [Environment Variables](#environment-variables-1)
   - [End-to-End curl Test](#end-to-end-curl-test)
9. [Application Pages](#application-pages)
10. [Environment Variables](#environment-variables)
11. [Team](#team)

---

## Project Overview

FlowGuard is a hackathon project built for commercial facility managers. It addresses three core operational pain points:

| Problem | FlowGuard Solution |
|---|---|
| Undetected water leaks causing thousands in damage | Real-time anomaly detection via LSTM autoencoder on sensor data |
| Manual, error-prone supply inventory checks | Automated supply level monitoring with reorder alerts |
| Reactive maintenance workflows | Structured work order system with priority routing |

The platform consists of two integrated components:

- **React Web Dashboard** — a role-gated operations centre for facility staff
- **Python Anomaly Detection API** — an ML service that scores 24-hour water usage windows for leak signatures

---

## Key Features

### Dashboard & Operations
- **Live KPI cards** — water usage today, active leaks, supply readiness, open work orders, estimated monthly cost
- **Water consumption analytics** — hourly usage vs. baseline chart with spike detection highlights
- **Priority alert panel** — real-time leak alerts with severity classification, water loss rate, and one-click technician assignment
- **Facility risk map** — interactive floor plan with colour-coded sensor dots (click any sensor for live reading and status)
- **Sanitation supply tracker** — per-item stock levels with reorder buttons and bulk reorder actions
- **Work order management** — full CRUD-style workflow with priority/status filtering and assignment tracking
- **Reports centre** — downloadable monthly, quarterly, and annual facility reports with type filtering

### Security & Access Control
- **Supabase Auth** — email/password authentication with email confirmation
- **PDPA-compliant registration** — collects only name and email; explicit consent checkbox with data retention notice
- **Role-Based Access Control (RBAC)** — 4 roles with granular permission enforcement:
  - `admin` — full access including user management
  - `facility_manager` — dashboard, monitoring, alerts, supplies, work orders, reports, settings
  - `technician` — dashboard, monitoring, alerts, work orders
  - `viewer` — read-only dashboard access
- **Protected routes** — unauthenticated users are redirected to login; unauthorised access shows a permission denial screen

### Anomaly Detection (ML Service)
- **LSTM Autoencoder** — unsupervised model trained exclusively on normal water usage patterns
- **Unsupervised detection** — no labelled anomaly data required at training time
- **Calibrated threshold** — 99th-percentile of validation reconstruction error (distribution-free, robust to heavy tails)
- **REST API** — FastAPI endpoint ready for integration with hardware sensors or SCADA systems
- **Performance** — Precision 0.97 · Recall 0.63 · F1 0.76 on synthetic test set

---

## Technology Stack

### Web Application

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | TailwindCSS 4 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Backend / Auth | Supabase (PostgreSQL + Auth) |
| State | React Context (AuthContext) |
| Routing | State-based (activePage state, no React Router) |

### Anomaly Detection

| Layer | Technology |
|---|---|
| ML Framework | PyTorch 2.x (CPU) |
| Data Processing | NumPy, Pandas, scikit-learn |
| API Server | FastAPI + Uvicorn |
| Visualisation | Matplotlib |
| Runtime | Python 3.11 |

---

## Repository Structure

```
FlowGuard/
│
├── src/                              # React web application
│   ├── components/
│   │   ├── auth/                     # Login, registration, protected route
│   │   │   ├── AuthScreen.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── dashboard/                # Dashboard widgets
│   │   │   ├── KPICards.jsx
│   │   │   ├── WaterAnalytics.jsx
│   │   │   ├── AlertsPanel.jsx
│   │   │   ├── FacilityMap.jsx
│   │   │   ├── SuppliesStatus.jsx
│   │   │   ├── WorkOrders.jsx
│   │   │   └── ReportsPreview.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx            # Search, building filter, notifications
│   │   │   └── Sidebar.jsx           # RBAC-filtered navigation
│   │   └── ui/
│   │       ├── Modal.jsx             # Reusable modal with Escape key support
│   │       └── Toast.jsx             # Auto-dismissing toast notification
│   ├── contexts/
│   │   └── AuthContext.jsx           # Session management, profile fetching
│   ├── data/
│   │   └── mockData.js               # Mock sensor, alert, supply, and user data
│   ├── hooks/
│   │   └── useRBAC.js                # RBAC hook exposing can() / canAny()
│   ├── lib/
│   │   ├── rbac.js                   # Role definitions, permission matrix
│   │   └── supabase.js               # Supabase client initialisation
│   ├── pages/                        # Full-page views (one per nav item)
│   │   ├── WaterMonitoringPage.jsx
│   │   ├── LeakAlertsPage.jsx
│   │   ├── SanitationSuppliesPage.jsx
│   │   ├── WorkOrdersPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── UserManagementPage.jsx
│   ├── App.jsx                       # Root layout, page routing state
│   └── main.jsx                      # Entry point, AuthProvider wrapper
│
├── anomaly_detection/                # Python ML service
│   ├── src/
│   │   ├── generate_data.py          # Step 1 — synthetic training/test data
│   │   ├── preprocess.py             # Step 2 — scaling and windowing
│   │   ├── model.py                  # LSTM Autoencoder architecture
│   │   ├── train.py                  # Step 3 — training loop with early stopping
│   │   ├── evaluate.py               # Step 4 — threshold calibration and metrics
│   │   ├── inference.py              # Step 5 — inference interface
│   │   └── api.py                    # Step 6 — FastAPI REST endpoint
│   ├── data/                         # Generated CSV files (git-ignored)
│   ├── models/                       # Saved weights and configs (git-ignored)
│   ├── plots/                        # Training and evaluation plots (git-ignored)
│   ├── requirements.txt
│   └── README.md                     # Detailed run guide and API contract
│
├── .env                              # Supabase credentials — NOT committed
├── .gitignore
├── package.json
├── vite.config.js
└── README.md                         # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- A **Supabase** project (free tier is sufficient)

---

### Web Application Setup

**1. Clone the repository**

```bash
git clone https://github.com/ZhenKang01/FlowGuard.git
cd FlowGuard
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

Both values are found in your Supabase project under **Settings → API**.

**4. Set up the Supabase database**

Run the following SQL in your Supabase SQL Editor to create the user profiles table with Row-Level Security:

```sql
-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text not null default 'viewer'
    check (role in ('admin', 'facility_manager', 'technician', 'viewer')),
  created_at timestamptz default now()
);

-- Enable Row-Level Security
alter table public.profiles enable row level security;

-- Users can read and update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_app_meta_data->>'role', 'viewer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**5. Start the development server**

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

**6. Build for production**

```bash
npm run build
```

---

### Anomaly Detection Module Setup

```bash
cd anomaly_detection

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt
# If behind a corporate proxy with SSL issues:
# pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
```

Run the full pipeline in order — each step produces artefacts consumed by the next:

```bash
python src/generate_data.py   # ~2s   generates synthetic CSV data
python src/preprocess.py      # ~1s   fits scalers, builds 24-hour windows
python src/train.py           # ~30s  trains the autoencoder, saves best checkpoint
python src/evaluate.py        # ~5s   calibrates threshold, reports precision/recall/F1
python src/inference.py       # ~1s   smoke test (4 test cases)
python src/api.py             # starts the API server on port 8000
```

See [anomaly_detection/README.md](anomaly_detection/README.md) for the full API contract and Python integration guide.

---

## Authentication & Access Control

### Roles and Permissions

| Permission | Viewer | Technician | Facility Manager | Admin |
|---|:---:|:---:|:---:|:---:|
| View dashboard | ✓ | ✓ | ✓ | ✓ |
| View water monitoring | | ✓ | ✓ | ✓ |
| View and acknowledge alerts | | ✓ | ✓ | ✓ |
| View and manage supplies | | | ✓ | ✓ |
| View and manage work orders | | ✓ | ✓ | ✓ |
| View and download reports | | | ✓ | ✓ |
| Access settings | | | ✓ | ✓ |
| Manage users | | | | ✓ |

### How it works

1. On sign-up, a `profiles` row is created via a Supabase database trigger with default role `viewer`
2. `AuthContext` fetches the profile on every session start and exposes `user`, `profile`, and `role`
3. `useRBAC()` exposes a `can(permission)` helper consumed throughout the app
4. The `Sidebar` filters navigation items — users only see sections they can access
5. `ProtectedRoute` wraps the entire app; unauthenticated users see the auth screen; unauthorised page access shows an access denied screen

### PDPA Compliance

The registration form collects the minimum data required for application function:

- **Full name** — for display and identification within the platform
- **Email address** — for authentication
- **Password** — for authentication

No unnecessary personal data is collected. Users are presented with a data notice explaining what is collected, why it is needed, how to access or delete it, and their rights under the Personal Data Protection Act — with explicit opt-in consent required before account creation.

---

## Anomaly Detection Module

### Pipeline Overview

```
Raw sensor readings (L/hr)
        │
        ▼
generate_data.py ── Synthetic 5-meter, 90-day dataset
        │              70 days normal training + 20 days with 7 anomaly windows
        │              145 total anomaly hours injected across meters
        ▼
preprocess.py ────── Per-meter Min-Max scaling (fit on train set only)
        │              Sliding 24-hour windows, stride = 1
        │              Temporal train/val split 80/20, no shuffle
        ▼
train.py ─────────── LSTM Autoencoder
        │              MSELoss on reconstruction, Adam optimiser lr=1e-3
        │              Early stopping patience=7, best checkpoint saved
        │              Typical result: stops at epoch 32, best epoch 25
        ▼
evaluate.py ──────── Score validation set (all-normal) to calibrate threshold
        │              99th-percentile of val reconstruction errors
        │              Test set: Precision 0.97, Recall 0.63, F1 0.76
        ▼
inference.py ─────── FlowGuardScorer (thread-safe singleton)
        │              score_window(meter_id, readings) -> dict
        ▼
api.py ───────────── FastAPI: POST /score · GET /health · GET /meters
                     CORS enabled, Pydantic v2 validation, lifespan context manager
```

### Model Architecture

```
Input  (batch, 24, 1)   24-hour window, 1 feature (normalised L/hr)
  |
  Encoder LSTM   input=1, hidden=32, layers=1
  |  -> hidden state h_n: (batch, 32)
  |
  Repeat latent  -> (batch, 24, 32)
  |
  Decoder LSTM   input=32, hidden=32, layers=1
  |
  Linear projection  32 -> 1
  |
Output (batch, 24, 1)   reconstructed window

Total parameters : 12,961
Training time    : ~30 s on CPU
Anomaly score    : mean squared error (input vs reconstruction)
Flag condition   : score >= threshold  (threshold = 99th pct of val errors)
```

### API Reference

#### `POST /score`

Score a 24-hour water usage window for a single meter.

**Request body**

```json
{
  "meter_id": "meter_02",
  "readings": [5.2, 3.1, 2.8, 2.5, 2.4, 3.9,
               18.4, 55.2, 82.1, 91.3, 88.7, 76.4,
               70.1, 74.8, 79.2, 81.0, 77.6, 60.3,
               44.1, 32.8, 22.5, 14.2, 9.6, 6.7]
}
```

| Field | Type | Constraints |
|---|---|---|
| `meter_id` | string | One of `meter_00` through `meter_04` |
| `readings` | float[] | Exactly 24 values, each >= 0, in L/hr, oldest reading first |

**Response 200**

```json
{
  "meter_id":   "meter_02",
  "anomaly":    false,
  "score":      0.00243557,
  "threshold":  0.00491800,
  "n_readings": 24
}
```

| Field | Description |
|---|---|
| `anomaly` | `true` = flag this window for investigation |
| `score` | MSE reconstruction error — higher means more unusual |
| `threshold` | Calibrated threshold from evaluation step |
| `n_readings` | Always 24 |

**Error responses**

| Status | Condition |
|---|---|
| `400` | Unknown `meter_id` or wrong number of readings |
| `422` | Wrong types or missing fields (Pydantic validation) |
| `503` | Model artefacts not loaded — run the pipeline first |

#### `GET /health`

```json
{ "status": "ok", "model_loaded": true }
```

#### `GET /meters`

```json
{ "meter_ids": ["meter_00", "meter_01", "meter_02", "meter_03", "meter_04"] }
```

#### Python integration (same process, no HTTP)

```python
from src.inference import score_window

result = score_window("meter_02", readings)   # list of 24 floats
if result["anomaly"]:
    dispatch_maintenance_alert(result)
```

#### Quick curl reference

```bash
curl http://localhost:8000/health
curl http://localhost:8000/meters

# Normal window
curl -X POST http://localhost:8000/score \
     -H "Content-Type: application/json" \
     -d '{"meter_id":"meter_00","readings":[30,28,25,22,20,19,18,22,55,80,85,82,78,75,80,83,79,65,50,40,35,30,28,25]}'

# Simulated leak (sustained high draw)
curl -X POST http://localhost:8000/score \
     -H "Content-Type: application/json" \
     -d '{"meter_id":"meter_00","readings":[400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400]}'
```

#### Known limitations

- **Low-value flatline gap** — sensor readings stuck near 0–2 L/hr are not reliably flagged because overnight normal consumption is also near zero. Complement with a rule-based variance floor check in production.
- **Synthetic training data** — the threshold and performance metrics are only valid against the synthetic test set. Retrain on 60+ days of real meter history before production deployment.

---

## Three-Layer Integration

FlowGuard's live anomaly path connects three independently runnable services:

```
React Dashboard  ──POST /score──►  FastAPI (LSTM model)  ──webhook──►  n8n workflow
      ▲                                     │                                │
      │                                     │  BackgroundTask               │
      │                                     ▼  (non-blocking)               │
      └────────────GET /alerts◄─────  in-memory store  ◄──POST /alerts──────┘
           (polls every 5 s)
```

### How the Layers Connect

| Layer | Technology | Role |
|---|---|---|
| **Layer 1 — Dashboard** | React 19 + Vite | Sends 24-hr reading windows to FastAPI; polls `/alerts` every 5 s to display routed alerts; Approve button calls `PATCH /alerts/{id}/approve` |
| **Layer 2 — Model API** | FastAPI + PyTorch LSTM | Scores windows; on anomaly fires a non-blocking POST to n8n (via `BackgroundTasks` — client never waits); stores alerts POSTed back by n8n |
| **Layer 3 — Workflow** | n8n | Receives anomaly payload; routes by severity (low/medium → auto-log, high → pending_approval + human review); POSTs structured alert back to FastAPI |

**Key design choices:**

- **Non-blocking n8n call**: `BackgroundTasks.add_task(_notify_n8n, payload)` runs in a thread pool *after* the HTTP response is sent. If n8n is down, `/score` still returns the anomaly verdict normally — the failure is only logged.
- **In-memory store**: alerts are held in a Python list (`_alerts`) for the hackathon. A production build would persist to a database.
- **Poll instead of WebSocket**: `setInterval` + `clearInterval` (with useEffect cleanup) is simpler than a WebSocket and sufficient at 5 s resolution.

### Local Run Sequence

Run each command in a separate terminal:

**Step 1 — Train the model (first time only)**

```bash
cd anomaly_detection
pip install -r requirements.txt
python src/generate_data.py
python src/preprocess.py
python src/train.py
python src/evaluate.py
```

**Step 2 — Start the FastAPI service**

```bash
cd anomaly_detection
export N8N_WEBHOOK_URL=http://localhost:5678/webhook/flowguard-anomaly
uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload
```

**Step 3 — Start n8n**

```bash
npx n8n
# open http://localhost:5678
# import n8n/FLOW_SPEC.md JSON skeleton → activate workflow
```

**Step 4 — Start the React dashboard**

```bash
cd c:/FlowGuard
npm run dev
# open http://localhost:5173
```

**Step 5 — Trigger a reading**

Open the dashboard → navigate to **Leak Alerts** → the LiveScanPanel calls
`POST /score` for all 5 meters automatically. meter_02 (sustained ~400 L/hr)
will register as an anomaly, fire n8n, and the alert will appear in the
IncomingAlertsPanel within 5 seconds.

### Environment Variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (Vite) | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` (Vite) | Yes | Supabase anonymous API key |
| `VITE_FLOWGUARD_API_URL` | `.env` (Vite) | No | FastAPI base URL (default: `http://localhost:8000`) |
| `N8N_WEBHOOK_URL` | shell / OS env | No | n8n webhook URL (default: `http://localhost:5678/webhook/flowguard-anomaly`) |

`N8N_WEBHOOK_URL` is a Python/OS env var, not a Vite var — set it in your
shell before starting uvicorn. It is intentionally absent from `.env` so it
doesn't end up bundled into the frontend build.

### End-to-End curl Test

**1. Check the model is loaded**

```bash
curl http://localhost:8000/health
# {"status":"ok","model_loaded":true}
```

**2. Score an anomalous window (meter_02)**

```bash
curl -s -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"meter_id":"meter_02","readings":[350,380,400,420,410,390,400,415,408,395,420,435,410,400,390,405,415,425,410,400,395,385,375,360]}' \
  | python -m json.tool
# {"meter_id":"meter_02","anomaly":true,"score":0.0431...,"threshold":0.0049...,"n_readings":24}
```

FastAPI fires `_notify_n8n` in the background immediately after returning this response.

**3. Simulate n8n posting an alert back (bypass n8n for quick demo)**

```bash
curl -s -X POST http://localhost:8000/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "meter_id":  "meter_02",
    "score":     0.04312,
    "threshold": 0.00491,
    "severity":  "high",
    "timestamp": "2026-06-11T08:23:11.412Z",
    "status":    "pending_approval",
    "recommendation": "Recommend shutting main valve for meter_02"
  }' | python -m json.tool
# {"id":"<uuid>","meter_id":"meter_02","status":"pending_approval",...}
```

**4. Fetch alerts (what the dashboard polls)**

```bash
curl http://localhost:8000/alerts | python -m json.tool
# {"alerts":[{"id":"<uuid>","severity":"high","status":"pending_approval",...}]}
```

**5. Approve the alert (what the Approve button calls)**

```bash
ALERT_ID=$(curl -s http://localhost:8000/alerts | python -c "import sys,json; a=json.load(sys.stdin)['alerts']; print(a[-1]['id'])")
curl -s -X PATCH "http://localhost:8000/alerts/${ALERT_ID}/approve" | python -m json.tool
# {"id":"<uuid>","status":"approved",...}
```

---

## Application Pages

| Page | Route Key | Minimum Role | Description |
|---|---|---|---|
| Facility Overview | `overview` | viewer | KPI cards, analytics chart, alerts panel, supply levels, sensor risk map, work order summary |
| Water Monitoring | `water` | technician | Time-range selector, full hourly chart, per-meter breakdown table |
| Leak Alerts | `alerts` | technician | Filterable alert list (All / Critical / Warning / Resolved), review modal, assign and resolve actions |
| Sanitation Supplies | `supplies` | facility_manager | Inventory levels with progress bars, per-item reorder with loading state, bulk reorder |
| Work Orders | `workorders` | technician | Filterable table (All / High Priority / In Progress / Completed), detail modal, context menu, new work order |
| Reports | `reports` | facility_manager | Type-filtered report card grid, download with loading state, generate report |
| Settings | `settings` | facility_manager | Profile form, notification toggle switches, alert threshold configuration |
| User Management | `users` | admin | User table with role badges, in-place role change dropdown, invite user |

---

## Environment Variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (Vite) | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` (Vite) | Yes | Supabase anonymous API key |
| `VITE_FLOWGUARD_API_URL` | `.env` (Vite) | No | FastAPI base URL (default: `http://localhost:8000`) |
| `N8N_WEBHOOK_URL` | shell / OS env | No | n8n webhook URL (default: `http://localhost:5678/webhook/flowguard-anomaly`) |

**Never commit `.env` to version control.** It is listed in `.gitignore`. `N8N_WEBHOOK_URL` is a shell env var — set it before starting uvicorn, not in `.env`.

---

## Team

| Person | Component |
|---|---|
| Person E | Anomaly Detection Module (`anomaly_detection/`) |

---

> **Prototype notice:** FlowGuard is a hackathon proof-of-concept. The anomaly detection model is trained on synthetic sensor data and the dashboard uses mock readings. Both are intended as working demonstrations, not production-ready systems. Thresholds, user data, and sensor readings shown in the UI are fabricated for demonstration purposes only.
