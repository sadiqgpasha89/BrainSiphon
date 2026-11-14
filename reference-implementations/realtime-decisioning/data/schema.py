"""Tables owned by this implementation (the platform tables live in bsref.db)."""

from sqlalchemy import Column, Float, Integer, String, Table, Text

from bsref.db import metadata

# ── the simulated operational system (in production: the payment switch's own database, which you do not own) ──
core_transactions = Table(
    "core_transactions",
    metadata,
    Column("txn_id", String(64), primary_key=True),
    Column("card_id", Integer, nullable=False),
    Column("merchant_id", Integer, nullable=False),
    Column("device_id", Integer, nullable=False),
    Column("amount", Float, nullable=False),
    Column("rail", String(8), nullable=False),
    Column("country", String(2), nullable=False),
    Column("event_time", Float, nullable=False),
)
core_chargebacks = Table(
    "core_chargebacks",
    metadata,
    Column("txn_id", String(64), primary_key=True),
    Column("filed_at", Float, nullable=False),
    Column("reason", String(32), nullable=False),
)
sim_state = Table("sim_state", metadata, Column("id", Integer, primary_key=True), Column("state", Text, nullable=False))

# ── the ML platform's side ──
raw_transactions = Table(
    "raw_transactions",
    metadata,
    Column("txn_id", String(64), primary_key=True),
    Column("card_id", Integer, nullable=False, index=True),
    Column("merchant_id", Integer, nullable=False),
    Column("device_id", Integer, nullable=False),
    Column("amount", Float, nullable=False),
    Column("rail", String(8), nullable=False),
    Column("country", String(2), nullable=False),
    Column("event_time", Float, nullable=False, index=True),
    Column("ingested_at", Float, nullable=False),
)
# The offline feature store: the feature vector logged at the moment the event was processed. Training reads these rows,
# so a training example can never contain information from after its own event time.
txn_features = Table(
    "txn_features",
    metadata,
    Column("txn_id", String(64), primary_key=True),
    Column("event_time", Float, nullable=False, index=True),
    Column("features", Text, nullable=False),
)
labels = Table(
    "labels",
    metadata,
    Column("txn_id", String(64), primary_key=True),
    Column("is_fraud", Integer, nullable=False),
    Column("source", String(16), nullable=False),  # chargeback | analyst | step-up
    Column("label_time", Float, nullable=False),
)
decisions = Table(
    "decisions",
    metadata,
    Column("idempotency_key", String(128), primary_key=True),
    Column("txn_id", String(64), nullable=False, index=True),
    Column("action", String(8), nullable=False),
    Column("score", Float, nullable=False),
    Column("reason", String(128), nullable=False),
    Column("model_version", String(16), nullable=False),
    Column("fallback", Integer, nullable=False),
    Column("features", Text, nullable=False),
    Column("latency_ms", Float, nullable=False),
    Column("created_at", Float, nullable=False, index=True),
)
