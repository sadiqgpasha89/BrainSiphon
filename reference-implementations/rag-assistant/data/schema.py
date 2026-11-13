"""Tables owned by this implementation (the platform tables live in bsref.db)."""

from sqlalchemy import Column, Float, Integer, String, Table, Text

from bsref.db import metadata

# ── the simulated documentation CMS ──
core_documents = Table(
    "core_documents", metadata,
    Column("doc_id", String(80), primary_key=True), Column("title", String(200), nullable=False), Column("body", Text, nullable=False),
    Column("version", Integer, nullable=False), Column("visibility", String(8), nullable=False),
    Column("updated_at", Float, nullable=False), Column("deleted", Integer, nullable=False),
)
sim_state = Table("sim_state", metadata, Column("id", Integer, primary_key=True), Column("state", Text, nullable=False))

# ── the assistant's side ──
documents = Table(
    "documents", metadata,
    Column("doc_id", String(80), primary_key=True), Column("title", String(200), nullable=False), Column("body", Text, nullable=False),
    Column("version", Integer, nullable=False), Column("visibility", String(8), nullable=False),
    Column("content_hash", String(64), nullable=False), Column("updated_at", Float, nullable=False), Column("ingested_at", Float, nullable=False),
)
chunks = Table(
    "chunks", metadata,
    Column("chunk_id", String(96), primary_key=True), Column("doc_id", String(80), nullable=False, index=True),
    Column("doc_version", Integer, nullable=False), Column("title", String(200), nullable=False),
    Column("visibility", String(8), nullable=False), Column("text", Text, nullable=False),
)
eval_examples = Table(  # the evaluation ("golden") set: seeded by the docs team, grown from reviewed production questions
    "eval_examples", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True), Column("question", Text, nullable=False),
    Column("expected_doc_id", String(80)),            # NULL = the question must be declined (unanswerable from the corpus)
    Column("must_contain", String(200), nullable=False),  # a string the answer has to contain ('' = no such check)
    Column("audience", String(8), nullable=False),    # public | internal: which reader asks
    Column("source", String(16), nullable=False),     # seed | review
    Column("created_at", Float, nullable=False),
)
answers = Table(
    "answers", metadata,
    Column("answer_id", String(32), primary_key=True), Column("question", Text, nullable=False), Column("asked_by", String(64), nullable=False),
    Column("audience", String(8), nullable=False), Column("status", String(12), nullable=False),  # answered | abstained | refused
    Column("answer", Text, nullable=False), Column("citations", Text, nullable=False), Column("retrieved", Text, nullable=False),
    Column("index_version", String(16), nullable=False), Column("provider", String(16), nullable=False),
    Column("top_score", Float, nullable=False), Column("unsupported_sentences", Integer, nullable=False),
    Column("latency_ms", Float, nullable=False), Column("created_at", Float, nullable=False, index=True),
)
