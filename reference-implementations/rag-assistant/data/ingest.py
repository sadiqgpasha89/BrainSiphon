"""Ingestion: validate each CMS event, skip unchanged content, re-chunk changed documents, remove deleted ones.

A paragraph that looks like an instruction to the model is quarantined instead of indexed; the rest of the page is kept.
"""

from __future__ import annotations

import hashlib
from typing import Any

from sqlalchemy import delete, insert, select
from sqlalchemy.engine import Connection

from bsref import db, validation
from bsref.config import load_yaml
from data import schema
from features import chunking

TOPIC, GROUP = "docs.events", "docs-ingest"
TOPIC_FOR = {"doc.published": TOPIC, "doc.updated": TOPIC, "doc.deleted": TOPIC}


class Ingestor:
    def __init__(self) -> None:
        self.contract = load_yaml("data/contracts/document.yaml")
        self.cfg = load_yaml("configs/pipeline.yaml")["chunking"]
        self.reset()

    def reset(self) -> None:
        self.stats = {"indexed_documents": 0, "unchanged": 0, "deleted": 0, "chunks": 0, "quarantined_documents": 0,
                      "quarantined_chunks": 0, "stale_ignored": 0}

    def handle(self, conn: Connection, event: dict[str, Any]) -> None:
        d = event["data"]
        stored = conn.execute(select(schema.documents.c.version, schema.documents.c.content_hash)
                              .where(schema.documents.c.doc_id == d.get("doc_id", ""))).first()
        if event["event_type"] == "doc.deleted":
            if stored:
                conn.execute(delete(schema.chunks).where(schema.chunks.c.doc_id == d["doc_id"]))
                conn.execute(delete(schema.documents).where(schema.documents.c.doc_id == d["doc_id"]))
                self.stats["deleted"] += 1
            return
        problems = validation.validate_record(self.contract, d)
        if problems:
            validation.quarantine(conn, "document", str(d.get("doc_id", "?")), problems, d)
            self.stats["quarantined_documents"] += 1
            return
        if stored and stored[0] > d["version"]:
            self.stats["stale_ignored"] += 1
            return
        digest = hashlib.sha256(f"{d['title']}\n{d['body']}\n{d['visibility']}".encode()).hexdigest()
        if stored and stored[1] == digest:
            self.stats["unchanged"] += 1  # re-published without a change: nothing to re-chunk or re-embed
            return
        db.upsert(conn, schema.documents, {"doc_id": d["doc_id"]},
                  {"title": d["title"], "body": d["body"], "version": d["version"], "visibility": d["visibility"],
                   "content_hash": digest, "updated_at": d["updated_at"], "ingested_at": db.now()})
        conn.execute(delete(schema.chunks).where(schema.chunks.c.doc_id == d["doc_id"]))
        # screen paragraph by paragraph BEFORE chunking, so that one planted paragraph does not take the page with it
        clean = []
        for n, para in enumerate(p for p in d["body"].split("\n\n") if p.strip()):
            if chunking.looks_like_injection(para):
                validation.quarantine(conn, "chunk", f"{d['doc_id']}:paragraph-{n}",
                                      ["text addressed to the model (possible prompt injection)"], {"text": para})
                self.stats["quarantined_chunks"] += 1
            else:
                clean.append(para)
        rows = []
        for i, text in enumerate(chunking.chunk("\n\n".join(clean), self.cfg["target_words"], self.cfg["overlap_words"])):
            cid = f"{d['doc_id']}#{i}"
            rows.append({"chunk_id": cid, "doc_id": d["doc_id"], "doc_version": d["version"], "title": d["title"],
                         "visibility": d["visibility"], "text": text})
        if rows:
            conn.execute(insert(schema.chunks), rows)
        self.stats["indexed_documents"] += 1
        self.stats["chunks"] += len(rows)
