# FlowGuard n8n Workflow Specification

## Purpose

When the FastAPI service detects an anomaly it POSTs a JSON payload to the
n8n webhook.  This workflow decides how to route the alert:

- **low / medium** — auto-log the alert by posting it back to FastAPI
- **high** — add a "Recommend shutting main valve" note and wait for a human
  to approve before marking it resolved (human-in-the-loop)

---

## Trigger payload (sent by FastAPI /score)

```json
{
  "meter_id":  "meter_02",
  "score":     0.04312,
  "threshold": 0.00491,
  "severity":  "high",
  "timestamp": "2026-06-11T08:23:11.412Z"
}
```

Paste this into the n8n **Webhook → Test** panel to step through the workflow
without running the Python model.

---

## Node-by-node specification

### Node 1 — Webhook  (trigger)

| Setting | Value |
|---------|-------|
| **HTTP Method** | POST |
| **Path** | `flowguard-anomaly` |
| **Response Mode** | Respond Immediately |
| **Response Body** | `{"status":"received"}` |

n8n gives you the full URL after saving:
`http://localhost:5678/webhook/flowguard-anomaly`

Set this as the `N8N_WEBHOOK_URL` shell variable before starting FastAPI.

---

### Node 2 — Switch  (route by severity)

| Setting | Value |
|---------|-------|
| **Mode** | Rules |
| **Value to evaluate** | `{{ $json.severity }}` |
| **Output 1 rule** | `equals "low"` OR `equals "medium"` — two conditions, **ANY** match |
| **Output 2 rule** | `equals "high"` |

Connect:
- Output 1 → **Node 3a** (auto-log path)
- Output 2 → **Node 3b** (high-severity path)

---

### Node 3a — Set  (low/medium path)

Prepares the alert body for FastAPI.

| Field | Expression |
|-------|-----------|
| `meter_id` | `{{ $json.meter_id }}` |
| `score` | `{{ $json.score }}` |
| `threshold` | `{{ $json.threshold }}` |
| `severity` | `{{ $json.severity }}` |
| `timestamp` | `{{ $json.timestamp }}` |
| `status` | `active` (literal) |
| `recommendation` | `` (empty — no action required) |

---

### Node 4a — HTTP Request  (low/medium → POST /alerts)

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | `http://localhost:8000/alerts` |
| **Body** | JSON — send all fields from Node 3a |
| **Headers** | `Content-Type: application/json` |

The dashboard's `IncomingAlertsPanel` polls `GET /alerts` every 5 s and will
display this alert with status `active`.

---

### Node 3b — Set  (high-severity path)

Same fields as 3a, plus:

| Field | Value |
|-------|-------|
| `status` | `pending_approval` (literal) |
| `recommendation` | `Recommend shutting main valve for {{ $json.meter_id }}` |

---

### Node 4b — HTTP Request  (high → POST /alerts)

Same as Node 4a but using the fields from Node 3b.

FastAPI stores the alert with `status: pending_approval`.  The dashboard shows
it with a purple "Approve" button.

---

### Node 5 — Wait  (human-in-the-loop — high path only)

> **This node pauses the workflow execution until a resume webhook is hit.**
> It enables the human-in-the-loop approval loop.

| Setting | Value |
|---------|-------|
| **Resume mode** | Webhook |
| **Webhook suffix** | `flowguard-approve` |
| **Authentication** | None (hackathon) |

n8n generates a unique resume URL per execution, e.g.:
`http://localhost:5678/webhook/flowguard-approve/<execution-id>`

**For the demo**, skip the Wait node complexity and use the simpler
FastAPI-managed flow described in [Option B](#option-b-fastapi-managed-approval)
below — the "Approve" button in the React dashboard calls
`PATCH /alerts/{id}/approve` directly without needing a resume URL.

---

### Node 6 — HTTP Request  (approval confirmed)

Triggered when the Wait node's resume URL is hit (Option A) or skipped (Option B).

| Setting | Value |
|---------|-------|
| **Method** | PATCH |
| **URL** | `http://localhost:8000/alerts/{{ $json.id }}/approve` |

---

## Option B — FastAPI-managed approval (recommended for demo)

The React dashboard already implements this simpler path:

1. `/score` detects anomaly → `_notify_n8n(payload)` fires in background
2. n8n routes → POSTs to `POST /alerts` with `status: pending_approval`
3. Dashboard polls `GET /alerts` every 5 s → shows purple Approve button
4. Operator clicks Approve → `PATCH /alerts/{id}/approve` → status becomes `approved`
5. Next poll shows `approved` badge — no n8n Wait node needed

This is functionally identical to the full loop for hackathon purposes:
the human decision is recorded in the alert store and visible in the UI.

---

## Importing into n8n

1. Open `http://localhost:5678`
2. New Workflow → three-dot menu → **Import from file** (or paste JSON below)
3. Activate the workflow
4. Note the Webhook URL shown on Node 1 and set it as the env var:
   ```bash
   export N8N_WEBHOOK_URL=http://localhost:5678/webhook/flowguard-anomaly
   ```
5. Restart the FastAPI service so it picks up the env var.

---

## Minimal n8n JSON skeleton

```json
{
  "name": "FlowGuard Anomaly Router",
  "nodes": [
    {
      "name": "FlowGuard Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "flowguard-anomaly",
        "responseMode": "lastNode",
        "responseData": "firstEntryJson",
        "options": {}
      },
      "position": [240, 300]
    },
    {
      "name": "Route by Severity",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "dataType": "string",
        "value1": "={{ $json.severity }}",
        "rules": {
          "rules": [
            { "value2": "low"    },
            { "value2": "medium" },
            { "value2": "high"   }
          ]
        },
        "fallbackOutput": "none"
      },
      "position": [460, 300]
    },
    {
      "name": "Set Low/Medium Alert",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            { "name": "meter_id",       "value": "={{ $json.meter_id }}"  },
            { "name": "severity",       "value": "={{ $json.severity }}"  },
            { "name": "timestamp",      "value": "={{ $json.timestamp }}" },
            { "name": "status",         "value": "active"                 },
            { "name": "recommendation", "value": ""                       }
          ],
          "number": [
            { "name": "score",     "value": "={{ $json.score }}"     },
            { "name": "threshold", "value": "={{ $json.threshold }}" }
          ]
        }
      },
      "position": [680, 200]
    },
    {
      "name": "POST Alert (low/medium)",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "http://localhost:8000/alerts",
        "sendBody": true,
        "contentType": "json",
        "bodyParametersJson": "={{ JSON.stringify($json) }}"
      },
      "position": [900, 200]
    },
    {
      "name": "Set High Alert",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            { "name": "meter_id",       "value": "={{ $json.meter_id }}"                                     },
            { "name": "severity",       "value": "high"                                                      },
            { "name": "timestamp",      "value": "={{ $json.timestamp }}"                                    },
            { "name": "status",         "value": "pending_approval"                                          },
            { "name": "recommendation", "value": "=Recommend shutting main valve for {{ $json.meter_id }}" }
          ],
          "number": [
            { "name": "score",     "value": "={{ $json.score }}"     },
            { "name": "threshold", "value": "={{ $json.threshold }}" }
          ]
        }
      },
      "position": [680, 420]
    },
    {
      "name": "POST Alert (high)",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "http://localhost:8000/alerts",
        "sendBody": true,
        "contentType": "json",
        "bodyParametersJson": "={{ JSON.stringify($json) }}"
      },
      "position": [900, 420]
    }
  ],
  "connections": {
    "FlowGuard Webhook":    { "main": [[{ "node": "Route by Severity",      "type": "main", "index": 0 }]] },
    "Route by Severity":    { "main": [
                               [{ "node": "Set Low/Medium Alert", "type": "main", "index": 0 }],
                               [{ "node": "Set Low/Medium Alert", "type": "main", "index": 0 }],
                               [{ "node": "Set High Alert",       "type": "main", "index": 0 }]
                             ]},
    "Set Low/Medium Alert": { "main": [[{ "node": "POST Alert (low/medium)", "type": "main", "index": 0 }]] },
    "Set High Alert":       { "main": [[{ "node": "POST Alert (high)",       "type": "main", "index": 0 }]] }
  }
}
```

> Paste the JSON above into n8n's **Import** dialog to get the skeleton.
> You will need to wire up the Switch node outputs manually in the UI since
> the `connections` block above maps both low AND medium to the same Set node.
