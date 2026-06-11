"""
router.py
=========
Intent classifier — the core of the agent's decision-making.

A single LLM call (temperature=0 for determinism) maps the user message to one
of four intents and returns a confidence score.  The confidence is surfaced to
the React UI as a small tag so the routing is visible and demoable.

Why a separate LLM call instead of inline classification?
  Keeping the router independent lets us swap classifiers (fine-tuned model,
  regex fallback) without changing the dispatch logic in agent.py.
"""

from __future__ import annotations

import json
import logging
import os

logger = logging.getLogger("flowguard.router")

INTENTS = ("protocol_question", "log_issue", "query_status", "smalltalk")

_SYSTEM = """\
You are an intent classifier for FlowGuard, a facility water-management system.

Classify the latest user message into exactly one intent:
- "protocol_question"  : asking about maintenance procedures, safety steps, supply thresholds, valve rules, hazard reporting
- "log_issue"          : wants to report a problem, file/create a work order, log a maintenance request
- "query_status"       : asking about current leak alerts, sensor readings, anomaly status, what's flagged right now
- "smalltalk"          : greetings, thanks, "what can you do?", or anything else

Return ONLY valid JSON — no prose, no markdown:
{"intent": "<one of the four>", "confidence": <float 0.0–1.0>}
"""


def classify(client, message: str, history: list[dict]) -> dict:
    """Return {"intent": str, "confidence": float}."""
    # Pass the last 3 turns so the classifier understands follow-up context
    messages = [{"role": "system", "content": _SYSTEM}]
    messages.extend(history[-6:])
    messages.append({"role": "user", "content": message})

    try:
        resp = client.chat.completions.create(
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
            messages=messages,
            temperature=0,
            max_tokens=60,
        )
        raw = resp.choices[0].message.content.strip()
        result = json.loads(raw)
        if result.get("intent") not in INTENTS:
            result["intent"] = "smalltalk"
        result.setdefault("confidence", 0.8)
        return result
    except Exception as exc:
        logger.warning("Intent classification failed: %s", exc)
        return {"intent": "smalltalk", "confidence": 0.5}
