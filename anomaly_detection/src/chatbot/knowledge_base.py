"""
knowledge_base.py
=================
Loads markdown docs from chatbot/knowledge/, splits them into overlapping
chunks, embeds them with the OpenAI embeddings API, and retrieves the top-k
most relevant chunks via cosine similarity.

Why cosine similarity over a vector DB?
  The knowledge base has < 100 chunks total (4 small docs).  In-memory numpy
  cosine similarity is faster to start, has zero dependencies, and behaves
  identically to any vector DB at this scale.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import numpy as np

# Knowledge docs live next to chatbot/ (one level up from src/)
KNOWLEDGE_DIR = Path(__file__).parent.parent.parent / "chatbot" / "knowledge"

CHUNK_SIZE    = 500   # max characters per chunk
CHUNK_OVERLAP = 80    # overlap so sentences at boundaries aren't lost
MIN_SIMILARITY = 0.25  # reject chunks below this cosine score (keeps replies grounded)


class KnowledgeBase:
    def __init__(self, openai_client):
        self._client  = openai_client
        self._model   = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
        self.chunks: list[dict] = []       # [{"text": str, "source": str}]
        self._embeddings: np.ndarray | None = None
        self._load_and_embed()

    # ── Public ─────────────────────────────────────────────────────────────────

    def retrieve(self, query: str, top_k: int = 3) -> list[dict]:
        """Return up to top_k chunks most relevant to query."""
        if not self.chunks or self._embeddings is None:
            return []

        q_emb = np.array(
            self._client.embeddings.create(model=self._model, input=[query])
            .data[0].embedding
        )

        # Cosine similarity: (A·B) / (‖A‖ ‖B‖)
        norms = np.linalg.norm(self._embeddings, axis=1) * np.linalg.norm(q_emb)
        sims  = (self._embeddings @ q_emb) / np.maximum(norms, 1e-9)

        top_idx = np.argsort(sims)[::-1][:top_k]
        return [
            {**self.chunks[i], "similarity": float(sims[i])}
            for i in top_idx
            if sims[i] >= MIN_SIMILARITY
        ]

    # ── Private ────────────────────────────────────────────────────────────────

    def _load_and_embed(self) -> None:
        if not KNOWLEDGE_DIR.exists():
            return

        for md_file in sorted(KNOWLEDGE_DIR.glob("*.md")):
            text = md_file.read_text(encoding="utf-8")
            for chunk in self._chunk(text, md_file.stem):
                self.chunks.append(chunk)

        if not self.chunks:
            return

        texts = [c["text"] for c in self.chunks]
        response = self._client.embeddings.create(model=self._model, input=texts)
        self._embeddings = np.array([e.embedding for e in response.data])

    def _chunk(self, text: str, source: str) -> list[dict]:
        """Split text into overlapping chunks on paragraph boundaries."""
        paragraphs = [p.strip() for p in re.split(r"\n\n+", text) if p.strip()]
        chunks: list[dict] = []
        current = ""

        for para in paragraphs:
            if len(current) + len(para) + 2 <= CHUNK_SIZE:
                current = (current + "\n\n" + para).strip()
            else:
                if current:
                    chunks.append({"text": current, "source": source})
                # Carry a tail of the previous chunk as overlap
                tail   = current[-CHUNK_OVERLAP:] if len(current) > CHUNK_OVERLAP else current
                current = (tail + "\n\n" + para).strip() if tail else para

        if current:
            chunks.append({"text": current, "source": source})
        return chunks
