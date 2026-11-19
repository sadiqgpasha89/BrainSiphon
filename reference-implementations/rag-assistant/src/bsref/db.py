"""One relational schema for the platform tables, portable between SQLite (local profile) and PostgreSQL (compose / cloud).

Only SQLAlchemy Core expressions are used, so the same code runs on both. Implementations add their own tables to `metadata`.
"""

from __future__ import annotations

import json
import time
from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import (
    BigInteger,
    Column,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    create_engine,
    delete,
    event,
    insert,
)
from sqlalchemy.engine import Connection, Engine

from .config import settings

metadata = MetaData()
PK = BigInteger().with_variant(Integer, "sqlite")  # SQLite only auto-increments INTEGER PRIMARY KEY

# ── source side: the transactional outbox written by the operational system in the same transaction as its own rows ──
outbox = Table(
    "outbox",
    metadata,
    Column("seq", PK, primary_key=True, autoincrement=True),
    Column("aggregate", String(64), nullable=False),
    Column("event_type", String(64), nullable=False),
    Column("key", String(128), nullable=False),
    Column("payload", Text, nullable=False),
    Column("created_at", Float, nullable=False),
)
cdc_checkpoint = Table(
    "cdc_checkpoint",
    metadata,
    Column("source", String(64), primary_key=True),
    Column("last_seq", BigInteger, nullable=False),
    Column("updated_at", Float, nullable=False),
)
# ── durable event log (the role Kafka plays in production) ──
events = Table(
    "events",
    metadata,
    Column("offset", PK, primary_key=True, autoincrement=True),
    Column("topic", String(64), nullable=False, index=True),
    Column("event_id", String(128), nullable=False),
    Column("key", String(128), nullable=False),
    Column("payload", Text, nullable=False),
    Column("published_at", Float, nullable=False),
    UniqueConstraint("topic", "event_id", name="uq_events_topic_event"),
)
consumer_offsets = Table(
    "consumer_offsets",
    metadata,
    Column("topic", String(64), primary_key=True),
    Column("consumer_group", String(64), primary_key=True),
    Column("committed", BigInteger, nullable=False),
)
dead_letters = Table(
    "dead_letters",
    metadata,
    Column("id", PK, primary_key=True, autoincrement=True),
    Column("topic", String(64), nullable=False),
    Column("consumer_group", String(64), nullable=False),
    Column("event_offset", BigInteger, nullable=False),
    Column("payload", Text, nullable=False),
    Column("error", Text, nullable=False),
    Column("created_at", Float, nullable=False),
)
quarantine = Table(
    "quarantine",
    metadata,
    Column("id", PK, primary_key=True, autoincrement=True),
    Column("dataset", String(64), nullable=False, index=True),
    Column("record_key", String(128), nullable=False),
    Column("violations", Text, nullable=False),
    Column("payload", Text, nullable=False),
    Column("created_at", Float, nullable=False),
)
online_features = Table(
    "online_features",
    metadata,
    Column("entity_type", String(32), primary_key=True),
    Column("entity_id", String(128), primary_key=True),
    Column("features", Text, nullable=False),
    Column("event_time", Float, nullable=False),
    Column("updated_at", Float, nullable=False),
)
review_tasks = Table(
    "review_tasks",
    metadata,
    Column("id", PK, primary_key=True, autoincrement=True),
    Column("kind", String(48), nullable=False, index=True),
    Column("subject_id", String(128), nullable=False),
    Column("payload", Text, nullable=False),
    Column("priority", Integer, nullable=False),
    Column("status", String(16), nullable=False, index=True),  # open | claimed | approved | rejected | expired
    Column("requested_by", String(64), nullable=False),
    Column("required_approvals", Integer, nullable=False),
    Column("assignee", String(64)),
    Column("decisions", Text, nullable=False),  # JSON list of {by, decision, notes, at}
    Column("created_at", Float, nullable=False),
    Column("due_at", Float, nullable=False),
    Column("closed_at", Float),
    UniqueConstraint("kind", "subject_id", name="uq_review_kind_subject"),
)
feedback = Table(
    "feedback",
    metadata,
    Column("id", PK, primary_key=True, autoincrement=True),
    Column("subject_type", String(32), nullable=False, index=True),
    Column("subject_id", String(128), nullable=False, index=True),
    Column("source", String(32), nullable=False),  # e.g. analyst | chargeback | user | planner
    Column("label", String(64), nullable=False),
    Column("detail", Text, nullable=False),
    Column("actor", String(64), nullable=False),
    Column("created_at", Float, nullable=False),
)
audit_log = Table(
    "audit_log",
    metadata,
    Column("id", PK, primary_key=True, autoincrement=True),
    Column("actor", String(64), nullable=False),
    Column("action", String(64), nullable=False),
    Column("resource", String(128), nullable=False),
    Column("detail", Text, nullable=False),
    Column("request_id", String(64), nullable=False),
    Column("at", Float, nullable=False),
)
alerts = Table(
    "alerts",
    metadata,
    Column("id", PK, primary_key=True, autoincrement=True),
    Column("rule", String(64), nullable=False, index=True),
    Column("severity", String(16), nullable=False),
    Column("value", Float, nullable=False),
    Column("threshold", Float, nullable=False),
    Column("message", Text, nullable=False),
    Column("status", String(16), nullable=False),  # firing | resolved
    Column("fired_at", Float, nullable=False),
    Column("resolved_at", Float),
)
metric_snapshots = Table(
    "metric_snapshots",
    metadata,
    Column("id", PK, primary_key=True, autoincrement=True),
    Column("name", String(64), nullable=False, index=True),
    Column("value", Float, nullable=False),
    Column("at", Float, nullable=False),
)


@lru_cache(maxsize=4)
def _engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        path = url.split("///", 1)[-1]
        if path and path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        eng = create_engine(url, connect_args={"check_same_thread": False, "timeout": 30})

        @event.listens_for(eng, "connect")
        def _pragmas(dbapi_conn, _record):  # WAL lets the API read while the worker writes
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA synchronous=NORMAL")
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()

        return eng
    return create_engine(url, pool_pre_ping=True, pool_size=10, max_overflow=10)


def engine() -> Engine:
    return _engine(settings().database_url)


def source_engine() -> Engine:
    """The operational system's database. Locally it is the same file; in production it is another database entirely."""
    return _engine(settings().source_database_url)


def reset_engines() -> None:
    """Tests point the settings at a fresh database between cases."""
    _engine.cache_clear()


def init_schema() -> None:
    metadata.create_all(engine())
    if settings().source_database_url != settings().database_url:
        metadata.create_all(source_engine())


@contextmanager
def tx(eng: Engine | None = None) -> Iterator[Connection]:
    """A transaction: commits on success, rolls back on any exception."""
    with (eng or engine()).begin() as conn:
        yield conn


def now() -> float:
    return time.time()


def dumps(obj: Any) -> str:
    return json.dumps(obj, separators=(",", ":"), sort_keys=True, default=str)


def upsert(conn: Connection, table: Table, keys: dict[str, Any], values: dict[str, Any]) -> None:
    """Portable upsert (delete then insert inside the caller's transaction)."""
    cond = [table.c[k] == v for k, v in keys.items()]
    conn.execute(delete(table).where(*cond))
    conn.execute(insert(table).values(**keys, **values))


def audit(conn: Connection, actor: str, action: str, resource: str, detail: Any = None, request_id: str = "") -> None:
    conn.execute(
        insert(audit_log).values(
            actor=actor, action=action, resource=resource, detail=dumps(detail or {}), request_id=request_id, at=now()
        )
    )
