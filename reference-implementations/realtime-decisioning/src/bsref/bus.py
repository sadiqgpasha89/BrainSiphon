"""A durable, ordered event log with consumer groups, committed offsets, retries and a dead-letter queue.

It is the seam where Kafka (or Kinesis / Pub/Sub) sits in production. The contract an implementation relies on is small:
  publish(topic, event_id, key, payload)  idempotent on (topic, event_id): at-least-once producers are safe
  consume(topic, group, handler)          each event is handled in its own transaction together with the offset commit,
                                          so a handler that writes to the same database gets exactly-once effects
A failing event is retried `max_attempts` times and then parked in dead_letters so one poison record cannot stop the stream.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from typing import Any

from sqlalchemy import func, insert, select
from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError

from . import db

log = logging.getLogger("bsref.bus")
Handler = Callable[[Connection, dict[str, Any]], None]


def publish(conn: Connection, topic: str, event_id: str, key: str, payload: dict[str, Any]) -> bool:
    """Append an event. Returns False when (topic, event_id) was already published (a producer retry)."""
    exists = conn.execute(
        select(db.events.c.offset).where(db.events.c.topic == topic, db.events.c.event_id == event_id)
    ).first()
    if exists:
        return False
    try:
        with conn.begin_nested():
            conn.execute(
                insert(db.events).values(
                    topic=topic, event_id=event_id, key=key, payload=db.dumps(payload), published_at=db.now()
                )
            )
    except IntegrityError:  # a concurrent producer won the race
        return False
    return True


def publish_many(conn: Connection, topic: str, items: list[tuple[str, str, dict[str, Any]]]) -> int:
    """Append many (event_id, key, payload) events in one round trip, skipping ids already published."""
    if not items:
        return 0
    ids = [i[0] for i in items]
    have = set(
        conn.execute(select(db.events.c.event_id).where(db.events.c.topic == topic, db.events.c.event_id.in_(ids))).scalars()
    )
    t = db.now()
    rows = [
        {"topic": topic, "event_id": eid, "key": key, "payload": db.dumps(payload), "published_at": t}
        for eid, key, payload in items
        if eid not in have
    ]
    if rows:
        conn.execute(insert(db.events), rows)
    return len(rows)


def committed(conn: Connection, topic: str, group: str) -> int:
    row = conn.execute(
        select(db.consumer_offsets.c.committed).where(
            db.consumer_offsets.c.topic == topic, db.consumer_offsets.c.consumer_group == group
        )
    ).first()
    return int(row[0]) if row else 0


def lag(conn: Connection, topic: str, group: str) -> int:
    """Events published to the topic that the group has not yet processed."""
    done = committed(conn, topic, group)
    n = conn.execute(
        select(func.count()).select_from(db.events).where(db.events.c.topic == topic, db.events.c.offset > done)
    ).scalar_one()
    return int(n)


def consume(
    topic: str,
    group: str,
    handler: Handler,
    batch: int = 500,
    max_attempts: int = 3,
    flush: Callable[[Connection], None] | None = None,
    reset: Callable[[], None] | None = None,
) -> dict[str, int]:
    """Process every pending event once. Safe to run repeatedly and from several workers of the same group in turn.

    Fast path: a whole batch is handled in ONE transaction together with its offset commit (micro-batching). A handler may
    buffer work and write it in `flush(conn)`, which runs inside that transaction. If anything in the batch fails, the
    transaction rolls back, `reset()` clears the handler's buffers, and the batch is replayed one event per transaction so
    that only the poison event is retried and dead-lettered.
    """
    stats = {"processed": 0, "dead_lettered": 0}
    eng = db.engine()

    def _commit(conn: Connection, offset: int) -> None:
        if flush:
            flush(conn)
        db.upsert(conn, db.consumer_offsets, {"topic": topic, "consumer_group": group}, {"committed": offset})

    while True:
        with eng.connect() as conn:
            start = committed(conn, topic, group)
            rows = conn.execute(
                select(db.events.c.offset, db.events.c.payload)
                .where(db.events.c.topic == topic, db.events.c.offset > start)
                .order_by(db.events.c.offset)
                .limit(batch)
            ).all()
        if not rows:
            return stats
        try:
            with db.tx(eng) as conn:
                for _, raw in rows:
                    handler(conn, json.loads(raw))
                _commit(conn, rows[-1][0])
            stats["processed"] += len(rows)
            continue
        except Exception as exc:  # noqa: BLE001
            log.warning("batch failed, replaying one event at a time", extra={"topic": topic, "error": str(exc)})
            if reset:
                reset()
        for offset, raw in rows:
            error = ""
            for attempt in range(1, max_attempts + 1):
                try:
                    with db.tx(eng) as conn:
                        handler(conn, json.loads(raw))
                        _commit(conn, offset)
                    error = ""
                    break
                except Exception as exc:  # noqa: BLE001 - any handler failure is retried, then dead-lettered
                    error = f"{type(exc).__name__}: {exc}"
                    if reset:
                        reset()
                    log.warning("handler failed", extra={"topic": topic, "offset": offset, "attempt": attempt, "error": error})
            if error:
                with db.tx(eng) as conn:
                    conn.execute(
                        insert(db.dead_letters).values(
                            topic=topic, consumer_group=group, event_offset=offset, payload=raw, error=error, created_at=db.now()
                        )
                    )
                    db.upsert(conn, db.consumer_offsets, {"topic": topic, "consumer_group": group}, {"committed": offset})
                stats["dead_lettered"] += 1
            else:
                stats["processed"] += 1
