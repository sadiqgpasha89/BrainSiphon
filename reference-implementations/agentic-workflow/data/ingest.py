"""Ingestion: validate each alert against its contract and open a case for it. A re-sent alert opens nothing."""

from __future__ import annotations

from typing import Any

from sqlalchemy import insert, select
from sqlalchemy.engine import Connection

from bsref import validation
from bsref.config import load_yaml
from data import schema

TOPIC, GROUP = "soc.alerts", "case-ingest"
TOPIC_FOR = {"alert.raised": TOPIC}


class Ingestor:
    def __init__(self) -> None:
        self.contract = load_yaml("data/contracts/alert.yaml")
        self.reset()

    def reset(self) -> None:
        self.stats = {"cases_opened": 0, "duplicates": 0, "quarantined": 0}

    def handle(self, conn: Connection, event: dict[str, Any]) -> None:
        a = event["data"]
        problems = validation.validate_record(self.contract, a)
        if problems:
            validation.quarantine(conn, "alert", str(a.get("alert_id", "?")), problems, a)
            self.stats["quarantined"] += 1
            return
        if conn.execute(select(schema.cases.c.case_id).where(schema.cases.c.case_id == a["alert_id"])).first():
            self.stats["duplicates"] += 1
            return
        conn.execute(insert(schema.cases).values(
            case_id=a["alert_id"], **{k: a[k] for k in ("rule", "severity", "host", "user", "src_ip", "summary", "created_at")},
            status="new", injection_suspected=0, steps=0))
        self.stats["cases_opened"] += 1
