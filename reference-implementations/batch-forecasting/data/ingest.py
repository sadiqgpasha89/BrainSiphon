"""Ingestion: validate each sales event against its contract and upsert it. A restatement replaces the earlier row, and an
out-of-order older change can never overwrite a newer one (the source sequence number decides)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.engine import Connection

from bsref import db, validation
from bsref.config import load_yaml
from data import schema

TOPIC, GROUP = "sales.events", "sales-ingest"
TOPIC_FOR = {"sales.day_closed": TOPIC, "sales.restated": TOPIC, "promo.planned": TOPIC}


class Ingestor:
    def __init__(self) -> None:
        self.contract = load_yaml("data/contracts/sales_day.yaml")
        self.reset()

    def reset(self) -> None:
        self.rows: dict[tuple[str, str, str], dict[str, Any]] = {}
        self.promos: set[tuple[str, str, str]] = set()
        self.stats = {"sales": 0, "restatements": 0, "promos": 0, "quarantined": 0, "stale_ignored": 0}

    def handle(self, conn: Connection, event: dict[str, Any]) -> None:
        d = event["data"]
        if event["event_type"] == "promo.planned":
            self.promos.add((d["store_id"], d["sku"], d["day"]))
            self.stats["promos"] += 1
            return
        problems = validation.validate_record(self.contract, d)
        if problems:
            validation.quarantine(conn, "sales_day", event["key"], problems, d)
            self.stats["quarantined"] += 1
            return
        key = (d["store_id"], d["sku"], d["day"])
        prior = self.rows.get(key)
        if prior is None:
            row = conn.execute(
                select(schema.sales_daily.c.source_seq).where(
                    schema.sales_daily.c.store_id == key[0], schema.sales_daily.c.sku == key[1], schema.sales_daily.c.day == key[2])
            ).first()
            prior = {"source_seq": row[0], "restated": 0} if row else None
        if prior is not None and prior["source_seq"] >= event["source_seq"]:
            self.stats["stale_ignored"] += 1  # a replay or an older change arriving late
            return
        restated = event["event_type"] == "sales.restated"
        self.rows[key] = {**d, "source_seq": event["source_seq"], "restated": int(restated), "updated_at": db.now()}
        self.stats["restatements" if restated else "sales"] += 1

    def flush(self, conn: Connection) -> None:
        for (s, k, day), row in self.rows.items():
            db.upsert(conn, schema.sales_daily, {"store_id": s, "sku": k, "day": day},
                      {c: v for c, v in row.items() if c not in ("store_id", "sku", "day")})
        for s, k, day in self.promos:
            db.upsert(conn, schema.promo_plan, {"store_id": s, "sku": k, "day": day}, {})
        self.rows, self.promos = {}, set()
