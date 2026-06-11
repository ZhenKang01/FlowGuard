"""
tools/work_order.py — Tool 2: Log an Issue / Work Order
=========================================================
Collects work-order fields conversationally, presents a confirmation summary,
and only writes to Supabase after an explicit "yes" from the user.

Human-in-the-loop guard
-----------------------
The confirmation step is intentional — the bot must never write on a vague
message.  The flow is:

  1. User describes a problem  →  LLM extracts fields (JSON, temperature=0)
  2. Any required field missing  →  ask for it (one at a time)
  3. All fields present  →  present [ORDER_DRAFT: {...}] confirmation card
  4. User replies "yes"  →  write to Supabase; user replies "no" → cancel

The [ORDER_DRAFT: {...}] marker is stored verbatim in conversation_history so
the server can find it on the next turn.  The React widget renders it as a
styled card so the demo looks polished.

RBAC enforcement (server-side)
-------------------------------
viewer role cannot create work orders.  This is checked here, not in the UI,
so it holds even if someone calls /chat directly.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone

import httpx

logger = logging.getLogger("flowguard.work_order")

# Roles permitted to create work orders
_CAN_CREATE = {"admin", "facility_manager", "technician"}

_EXTRACT_SYSTEM = """\
Extract work-order fields from the conversation.
Return ONLY a JSON object — no other text:
{
  "location":    <string or null>,
  "issue_type":  <string or null>,
  "severity":    <"Low" | "Medium" | "High" | null>,
  "description": <string or null>
}
If a field is unclear or not mentioned, use null.
"""

_COLLECT_SYSTEM = """\
You are FlowGuard's work-order assistant. You are collecting information to file a \
maintenance request. Be brief and friendly. Ask for ONE missing field at a time.
Current fields: {fields}
Missing: {missing}
"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_fields(client, message: str, history: list[dict]) -> dict:
    messages = [{"role": "system", "content": _EXTRACT_SYSTEM}]
    messages.extend(history[-6:])
    messages.append({"role": "user", "content": message})

    resp = client.chat.completions.create(
        model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
        messages=messages,
        temperature=0,
        max_tokens=200,
    )
    try:
        return json.loads(resp.choices[0].message.content.strip())
    except json.JSONDecodeError:
        return {"location": None, "issue_type": None, "severity": None, "description": None}


def _find_pending_order(history: list[dict]) -> dict | None:
    """Scan the last assistant message for an [ORDER_DRAFT: {...}] block."""
    for msg in reversed(history):
        if msg.get("role") == "assistant":
            m = re.search(r"\[ORDER_DRAFT:\s*(\{.*?\})\]", msg["content"], re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except json.JSONDecodeError:
                    return None
    return None


def _is_yes(message: str) -> bool:
    low = message.lower().strip()
    return any(w in low for w in ("yes", "confirm", "correct", "proceed", "go ahead", "yep", "sure", "ok"))


def _is_no(message: str) -> bool:
    low = message.lower().strip()
    return any(w in low for w in ("no", "cancel", "stop", "abort", "nevermind", "never mind", "nope"))


def _write_to_supabase(order: dict, user_role: str) -> tuple[bool, str]:
    """Returns (success, message)."""
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url or not key:
        return False, "supabase_not_configured"

    payload = {
        "location":       order.get("location"),
        "issue_type":     order.get("issue_type"),
        "severity":       order.get("severity", "Medium"),
        "description":    order.get("description"),
        "status":         "Open",
        "created_by_role": user_role,
        "source":         "chatbot",
        "created_at":     datetime.now(timezone.utc).isoformat(),
    }

    try:
        with httpx.Client(timeout=5.0) as http:
            r = http.post(
                f"{url}/rest/v1/work_orders",
                json=payload,
                headers={
                    "apikey":         key,
                    "Authorization":  f"Bearer {key}",
                    "Content-Type":   "application/json",
                    "Prefer":         "return=representation",
                },
            )
            if r.status_code in (200, 201):
                return True, "ok"
            logger.error("Supabase insert failed: %d %s", r.status_code, r.text)
            return False, "db_error"
    except Exception as exc:
        logger.error("Supabase write exception: %s", exc)
        return False, "network_error"


# ── Main handler ──────────────────────────────────────────────────────────────

def handle(client, message: str, user_role: str, history: list[dict]) -> str:
    # Server-side RBAC: viewers cannot create work orders
    if user_role not in _CAN_CREATE:
        return (
            "Your account role (*viewer*) doesn't have permission to create work orders. "
            "Please ask your facility manager to raise the request."
        )

    # ── Confirmation flow ────────────────────────────────────────────────────
    pending = _find_pending_order(history)

    if pending and _is_no(message):
        return "Work order cancelled. Let me know if you need anything else."

    if pending and _is_yes(message):
        ok, reason = _write_to_supabase(pending, user_role)

        if reason == "supabase_not_configured":
            # Config missing — acknowledge for demo without a DB
            return (
                "Work order noted (Supabase write skipped — "
                "`SUPABASE_SERVICE_ROLE_KEY` not set on the server).\n\n"
                f"- **Location**: {pending.get('location')}\n"
                f"- **Issue**: {pending.get('issue_type')}\n"
                f"- **Severity**: {pending.get('severity')}\n"
                f"- **Description**: {pending.get('description')}"
            )

        if ok:
            return (
                "Work order created successfully.\n\n"
                f"- **Location**: {pending.get('location')}\n"
                f"- **Issue**: {pending.get('issue_type')}\n"
                f"- **Severity**: {pending.get('severity')}\n"
                f"- **Status**: Open"
            )

        return (
            "There was a problem saving to the database. "
            "Please log the work order manually in the Work Orders page."
        )

    # ── Field collection ─────────────────────────────────────────────────────
    fields = _extract_fields(client, message, history)
    missing = [k for k, v in fields.items() if not v]

    if missing:
        resp = client.chat.completions.create(
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": _COLLECT_SYSTEM.format(
                        fields=json.dumps(fields), missing=missing
                    ),
                },
                *history[-4:],
                {"role": "user", "content": message},
            ],
            temperature=0.5,
            max_tokens=150,
        )
        return resp.choices[0].message.content

    # ── All fields collected — present confirmation draft ────────────────────
    draft_json = json.dumps(fields, ensure_ascii=False)
    return (
        "Here's what I'll log:\n\n"
        f"- **Location**: {fields['location']}\n"
        f"- **Issue**: {fields['issue_type']}\n"
        f"- **Severity**: {fields['severity']}\n"
        f"- **Description**: {fields['description']}\n\n"
        "Reply **yes** to confirm or **no** to cancel.\n\n"
        f"[ORDER_DRAFT: {draft_json}]"
    )
