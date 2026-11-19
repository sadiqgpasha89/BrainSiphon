"""The answer pipeline: retrieve (with access control) -> decide whether to answer -> generate -> verify every citation.

The assistant abstains when retrieval does not cover the question, when the generator produces nothing, or when no sentence
survives verification. An abstention is a correct product behaviour here ("I can't find that in the documentation"), and each
one is sent to the documentation team's queue, because it usually marks a gap in the docs.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import asdict, dataclass
from typing import Any

from bsref import featurestore
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from serving import llm
from serving.model import RetrievalIndex, tokens

log = logging.getLogger("serving")
ABSTAIN = "I can't find that in the documentation I have access to."
RELOAD_SECONDS = 3.0


@dataclass
class Answer:
    status: str                      # answered | abstained | refused
    answer: str
    citations: list[dict[str, Any]]  # [{chunk_id, doc_id, title, doc_version}]
    retrieved: list[dict[str, Any]]  # [{chunk_id, score, coverage}]
    index_version: str
    provider: str
    top_score: float
    unsupported_sentences: int
    latency_ms: float

    def public(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if k not in ("retrieved", "unsupported_sentences", "top_score")}


def support(sentence: str, chunk_text: str) -> float:
    """Share of the sentence's content words that occur in the chunk it cites."""
    words = set(tokens(sentence))
    return len(words & set(tokens(chunk_text))) / len(words) if words else 0.0


class Assistant:
    def __init__(self) -> None:
        self.cfg = load_yaml("configs/pipeline.yaml")
        self.fields = featurestore.feature_names(self.cfg["feature_view"])
        self.registry = Registry(settings().registry_dir)
        self.index: RetrievalIndex | None = None
        self.version = "none"
        self._checked = 0.0
        self._lock = threading.Lock()

    def refresh(self, force: bool = False) -> None:
        if not force and time.monotonic() - self._checked < RELOAD_SECONDS:
            return
        with self._lock:
            self._checked = time.monotonic()
            try:
                wanted = self.registry.production_version(self.cfg["model_name"])
                if wanted is None:
                    self.index, self.version = None, "none"
                elif wanted != self.version:
                    index, manifest = self.registry.load(self.cfg["model_name"], wanted)
                    if list(index.fields) != self.fields:
                        log.error("index refused: chunk schema mismatch", extra={"version": wanted})
                        return
                    self.index, self.version = index, manifest["version"]
                    log.info("index loaded", extra={"version": self.version, "chunks": len(index.chunks)})
            except RegistryError as exc:
                log.error("index load failed", extra={"error": str(exc)})

    def ready(self) -> bool:
        self.refresh()
        return self.index is not None

    def ask(self, question: str, visibilities: tuple[str, ...], index: RetrievalIndex | None = None) -> Answer:
        t0 = time.perf_counter()
        self.refresh()
        idx = index or self.index
        r, g = self.cfg["retrieval"], self.cfg["generation"]
        provider = g["provider"]

        def done(status: str, text: str, cites: list, retrieved: list, top: float, unsupported: int = 0) -> Answer:
            return Answer(status, text, cites, [{k: c[k] for k in ("chunk_id", "score", "coverage")} for c in retrieved],
                          self.version, provider, top, unsupported, round((time.perf_counter() - t0) * 1000, 2))

        if idx is None:
            return done("abstained", "The documentation index is not available right now.", [], [], 0.0)
        retrieved = idx.search(question, r["top_k"], visibilities)
        top = max((c["coverage"] for c in retrieved), default=0.0)
        if top < r["min_score"]:
            return done("abstained", ABSTAIN, [], retrieved, top)
        try:
            if provider == "anthropic":
                sents = llm.anthropic_generate(question, retrieved, g["anthropic_model"])
            else:
                sents = llm.extractive(question, retrieved, idx, g["max_sentences"])
        except llm.Refused:
            return done("refused", "I can't help with that request.", [], retrieved, top)
        by_id = {c["chunk_id"]: c for c in retrieved}
        kept, cites, unsupported = [], [], 0
        for s in sents:
            c = by_id.get(s.get("chunk_id", ""))  # a citation of something that was not retrieved is a fabricated citation
            if c is None or support(s["text"], f"{c['title']} {c['text']}") < g["min_support"]:
                unsupported += 1
                continue
            kept.append(f"{s['text'].strip()} [{c['chunk_id']}]")
            if c["chunk_id"] not in {x["chunk_id"] for x in cites}:
                cites.append({k: c[k] for k in ("chunk_id", "doc_id", "title", "doc_version")})
        if not kept:
            return done("abstained", ABSTAIN, [], retrieved, top, unsupported)
        return done("answered", " ".join(kept), cites, retrieved, top, unsupported)
