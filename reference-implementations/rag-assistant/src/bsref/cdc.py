"""Change data capture with the transactional-outbox pattern.

The operational system writes its business row and an `outbox` row in ONE transaction, so an event exists if and only if the
change committed. This relay tails the outbox in sequence order and publishes to the event log. It checkpoints the last
sequence it relayed; publishing is idempotent on the outbox sequence, so a crash between publish and checkpoint only causes a
harmless re-publish. In production the same outbox table is tailed by Debezium (log-based CDC) instead of this poller; nothing
downstream changes.
"""

from __future__ import annotations

import json
import logging

from sqlalchemy import select

from . import bus, db

log = logging.getLogger("bsref.cdc")


def append_outbox(conn, aggregate: str, event_type: str, key: str, payload: dict) -> None:
    """Called by the operational system inside its own transaction."""
    conn.execute(
        db.outbox.insert().values(
            aggregate=aggregate, event_type=event_type, key=str(key), payload=db.dumps(payload), created_at=db.now()
        )
    )


def relay(topic_for: dict[str, str], source: str = "source-db", batch: int = 1000) -> dict[str, int]:
    """Relay all outbox rows after the checkpoint. `topic_for` maps an event type to its topic."""
    relayed = skipped = 0
    src, dst = db.source_engine(), db.engine()
    while True:
        with dst.connect() as conn:
            row = conn.execute(select(db.cdc_checkpoint.c.last_seq).where(db.cdc_checkpoint.c.source == source)).first()
            last = int(row[0]) if row else 0
        with src.connect() as conn:
            rows = conn.execute(
                select(db.outbox).where(db.outbox.c.seq > last).order_by(db.outbox.c.seq).limit(batch)
            ).mappings().all()
        if not rows:
            return {"relayed": relayed, "unrouted": skipped, "checkpoint": last}
        by_topic: dict[str, list[tuple[str, str, dict]]] = {}
        for r in rows:
            topic = topic_for.get(r["event_type"])
            if topic is None:
                skipped += 1
                continue
            envelope = {
                "event_type": r["event_type"],
                "aggregate": r["aggregate"],
                "key": r["key"],
                "source_seq": r["seq"],
                "emitted_at": r["created_at"],
                "data": json.loads(r["payload"]),
            }
            by_topic.setdefault(topic, []).append((f"{source}:{r['seq']}", r["key"], envelope))
        with db.tx(dst) as conn:
            for topic, items in by_topic.items():
                relayed += bus.publish_many(conn, topic, items)
            db.upsert(conn, db.cdc_checkpoint, {"source": source}, {"last_seq": rows[-1]["seq"], "updated_at": db.now()})
        log.debug("cdc relay batch", extra={"rows": len(rows), "checkpoint": rows[-1]["seq"]})
