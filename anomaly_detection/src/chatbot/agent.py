"""
agent.py — FlowGuard Chat Agent
================================
Orchestrates the full pipeline for a single /chat turn:

  1. Classify intent  (router.classify)
  2. Dispatch to tool (rag / work_order / live_status)
  3. Return reply + intent so the UI can show the routing decision

This is a single-agent design: one router, three tools, one LLM provider.
The intent is returned to the caller so it can be displayed in the React
widget — making the routing visible is intentional for the demo.

Replaced: originally planned Botpress integration.  This custom agent gives
tighter coupling with /alerts, the LSTM scorer, and Supabase RBAC.
"""

from __future__ import annotations

import logging
import os

import openai

from .knowledge_base import KnowledgeBase
from .router import classify
from .tools import live_status, rag, work_order

logger = logging.getLogger("flowguard.agent")

_SMALLTALK_SYSTEM = """\
You are FlowGuard's facility management assistant. You help facility staff with:
- Maintenance protocols and safety procedures
- Logging work orders and maintenance requests
- Checking live sensor and alert status

Keep replies brief and professional. For critical actions (valve shutoffs, evacuations),
RECOMMEND them clearly but never claim to execute them automatically — a human must act.
"""


class FlowGuardAgent:
    """Instantiated once at FastAPI startup; shared across all /chat requests."""

    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            logger.warning("OPENAI_API_KEY not set — chatbot will return config error")
            self._client = None
            self._kb     = None
            return

        self._client = openai.OpenAI(api_key=api_key)

        try:
            self._kb = KnowledgeBase(self._client)
            logger.info("Knowledge base ready: %d chunks", len(self._kb.chunks))
        except Exception as exc:
            logger.error("Knowledge base failed to load: %s", exc)
            self._kb = None

    # ── Public ─────────────────────────────────────────────────────────────────

    def process(
        self,
        message: str,
        user_role: str,
        conversation_history: list[dict],
        current_alerts: list[dict],
        scorer=None,
    ) -> dict:
        """
        Returns {"intent": str, "confidence": float, "reply": str}.
        """
        if self._client is None:
            return {
                "intent":     "error",
                "confidence": 0.0,
                "reply": (
                    "The chatbot is not configured. "
                    "Set OPENAI_API_KEY on the FastAPI server and restart."
                ),
            }

        # Step 1: classify intent
        classification = classify(self._client, message, conversation_history)
        intent     = classification.get("intent", "smalltalk")
        confidence = classification.get("confidence", 0.8)

        # Step 2: dispatch
        try:
            if intent == "protocol_question" and self._kb is not None:
                reply = rag.answer(self._client, message, conversation_history, self._kb)

            elif intent == "protocol_question":
                reply = (
                    "The knowledge base failed to load at startup. "
                    "Please restart the API server."
                )

            elif intent == "log_issue":
                reply = work_order.handle(
                    self._client, message, user_role, conversation_history
                )

            elif intent == "query_status":
                reply = live_status.handle(
                    self._client, message, current_alerts, scorer
                )

            else:
                reply = self._smalltalk(message, conversation_history)

        except Exception as exc:
            logger.error("Tool error (intent=%s): %s", intent, exc, exc_info=True)
            reply = (
                "I ran into an issue processing that request. "
                "Please try again or contact your supervisor."
            )

        return {"intent": intent, "confidence": round(confidence, 2), "reply": reply}

    # ── Private ────────────────────────────────────────────────────────────────

    def _smalltalk(self, message: str, history: list[dict]) -> str:
        messages = [{"role": "system", "content": _SMALLTALK_SYSTEM}]
        messages.extend(history[-6:])
        messages.append({"role": "user", "content": message})

        resp = self._client.chat.completions.create(
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
            messages=messages,
            temperature=0.7,
            max_tokens=300,
        )
        return resp.choices[0].message.content
