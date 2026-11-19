"""Source integration, CDC, validation, chunking and injection screening."""

from sqlalchemy import func, select

from bsref import cdc, db
from data import schema, worker
from features import chunking


def test_every_valid_document_is_ingested_and_the_malformed_one_quarantined(world):
    with db.tx() as c:
        docs = c.execute(select(func.count()).select_from(schema.documents)).scalar_one()
        bad = c.execute(select(db.quarantine.c.violations).where(db.quarantine.c.dataset == "document")).scalars().all()
        assert c.execute(select(func.count()).select_from(db.dead_letters)).scalar_one() == 0
    assert docs == world["seeded"]["published"] == 31
    assert len(bad) == 1 and "visibility" in bad[0]


def test_injected_instructions_are_quarantined_and_never_indexed(world):
    with db.tx() as c:
        texts = c.execute(select(schema.chunks.c.text)).scalars().all()
        held = c.execute(select(func.count()).select_from(db.quarantine).where(db.quarantine.c.dataset == "chunk")).scalar_one()
    assert held >= 1 and not any(chunking.looks_like_injection(t) for t in texts)
    assert any("request id" in t for t in texts)  # the harmless part of the same page is still searchable


def test_chunking_respects_the_target_and_overlaps_on_sentence_boundaries():
    body = "\n\n".join(f"Paragraph {p} opens here with several plain words. It then closes with sentence {p}b." for p in range(6))
    parts = chunking.chunk(body, target_words=30, overlap_words=12)
    assert len(parts) >= 3 and all(len(p.split()) <= 30 + 12 for p in parts)
    for prev, nxt in zip(parts, parts[1:], strict=False):
        carried = chunking.sentences(nxt)[0]
        assert carried in prev and carried.endswith(".")  # a whole sentence, never a fragment


def test_republishing_unchanged_content_does_nothing_and_stale_versions_are_ignored(world):
    with db.tx() as c:
        doc = dict(c.execute(select(schema.core_documents).where(schema.core_documents.c.doc_id == "webhooks")).mappings().one())
        before = c.execute(select(schema.chunks.c.chunk_id).where(schema.chunks.c.doc_id == "webhooks")).scalars().all()
    payload = {k: doc[k] for k in ("doc_id", "title", "body", "version", "visibility", "updated_at")}
    with db.tx(db.source_engine()) as c:
        cdc.append_outbox(c, "document", "doc.updated", "webhooks", payload)                       # same content again
        cdc.append_outbox(c, "document", "doc.updated", "webhooks", {**payload, "version": 0 + 1, "body": "old text"} | {"version": 1})
    out = worker.run_once()["ingest"]
    assert out["unchanged"] == 1 and out["indexed_documents"] == 1  # the second event changes content at the same version
    with db.tx(db.source_engine()) as c:
        cdc.append_outbox(c, "document", "doc.updated", "webhooks", {**payload, "version": 5})   # restore, newer version
        cdc.append_outbox(c, "document", "doc.updated", "webhooks", {**payload, "version": 2, "body": "stale"})
    out = worker.run_once()["ingest"]
    assert out["indexed_documents"] == 1 and out["stale_ignored"] == 1
    with db.tx() as c:
        after = c.execute(select(schema.chunks.c.chunk_id).where(schema.chunks.c.doc_id == "webhooks")).scalars().all()
        body = c.execute(select(schema.documents.c.body).where(schema.documents.c.doc_id == "webhooks")).scalar_one()
    assert sorted(after) == sorted(before) and body == doc["body"]
