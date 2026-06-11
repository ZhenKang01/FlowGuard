"""
tools/live_status.py — Tool 3: Live Status Query
==================================================
Answers questions about current alerts by reading the in-memory _alerts store
passed from api.py.  No HTTP self-call needed — the data is injected as a
parameter, which avoids circular imports and is simpler than a loopback request.

Grounding rule: only data that the API actually returned is reported.
The LLM is instructed never to fabricate readings or statuses.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger("flowguard.live_status")

_SEV_LABEL = {"low": "Low", "medium": "Medium", "high": "HIGH"}

_SYSTEM = """\
You are FlowGuard's status reporter. Answer the user's question using ONLY the \
live alert data provided below. Do not invent statuses, readings, or meter IDs.

If a HIGH-severity alert is present, surface it clearly. Note that you can only \
RECOMMEND actions (e.g. "shut the valve") — you cannot execute anything automatically. \
A human must take the physical action.

Current system data:
{data_summary}
"""


def handle(client, message: str, alerts: list[dict], scorer=None) -> str:
    # Build a plain-text summary the LLM can reason over
    if not alerts:
        summary = "No alerts in the system. All meters are operating normally."
    else:
        active   = [a for a in alerts if a.get("status") not in ("approved", "resolved")]
        high     = [a for a in active  if a.get("severity") == "high"]
        lines    = []

        if high:
            lines.append(f"HIGH-SEVERITY ALERTS ({len(high)}):")
            for a in high:
                lines.append(
                    f"  Meter {a.get('meter_id','?')} | "
                    f"status: {a.get('status','?').replace('_',' ')} | "
                    f"score: {a.get('score',0):.4f}"
                )
                if rec := a.get("recommendation"):
                    lines.append(f"  Recommendation: {rec}")

        if active:
            lines.append(f"\nAll active alerts ({len(active)} total):")
            for a in active:
                lines.append(
                    f"  {a.get('meter_id','?')} | "
                    f"severity: {_SEV_LABEL.get(a.get('severity',''), a.get('severity','?'))} | "
                    f"status: {a.get('status','?').replace('_',' ')}"
                )
        else:
            lines.append("No active (unresolved) alerts.")

        summary = "\n".join(lines)

    resp = client.chat.completions.create(
        model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": _SYSTEM.format(data_summary=summary)},
            {"role": "user", "content": message},
        ],
        temperature=0.2,
        max_tokens=400,
    )
    return resp.choices[0].message.content
