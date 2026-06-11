"""
tools/rag.py — Tool 1: Protocol Q&A
=====================================
Retrieves the most relevant knowledge-base chunks for the user's question, then
asks the LLM to answer using ONLY those chunks.

Grounding rule: if no chunk scores above MIN_SIMILARITY (defined in knowledge_base.py),
the tool returns a "not in documentation" response instead of hallucinating.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger("flowguard.rag")

_SYSTEM = """\
You are FlowGuard's protocol assistant. Answer the user's question using ONLY the \
documentation excerpts provided below. If the answer is not in the excerpts, say: \
"I don't have specific documentation on that — please consult your facility manual or ask your supervisor."

Do not invent procedures, thresholds, or contact details. Keep your answer concise and action-oriented.

Documentation excerpts:
{context}
"""

_NOT_FOUND = (
    "I couldn't find relevant documentation for that question. "
    "Please consult your facility manual or contact your supervisor directly."
)


def answer(client, message: str, history: list[dict], knowledge_base) -> str:
    chunks = knowledge_base.retrieve(message, top_k=3)

    if not chunks:
        return _NOT_FOUND

    context = "\n\n---\n\n".join(
        f"[Source: {c['source']}]\n{c['text']}" for c in chunks
    )

    messages = [{"role": "system", "content": _SYSTEM.format(context=context)}]
    messages.extend(history[-6:])
    messages.append({"role": "user", "content": message})

    resp = client.chat.completions.create(
        model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
        messages=messages,
        temperature=0.2,
        max_tokens=500,
    )
    return resp.choices[0].message.content
