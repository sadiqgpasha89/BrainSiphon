"""Streaming ingestion: validate each event against its contract, land it, compute and log its features, update the online
feature store, and turn chargebacks into labels.

Transactions and chargebacks share one ordered topic on purpose: the merchant chargeback rate is only point-in-time correct
if a chargeback is applied after every transaction that preceded it and before every transaction that followed it.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import insert, select
from sqlalchemy.engine import Connection

from bsref import db, featurestore, validation
from bsref.config import load_yaml
from data import schema
from features import transforms

TOPIC, GROUP = "payments.events", "feature-ingest"
TOPIC_FOR = {"txn.authorised": TOPIC, "chargeback.filed": TOPIC}


class Ingestor:
    """Buffers one micro-batch: entity states are read once, changed in memory and written back in `flush`."""

    def __init__(self) -> None:
        self.contract = load_yaml("data/contracts/transaction.yaml")
        self.reset()

    def reset(self) -> None:
        self.states: dict[tuple[str, str], dict[str, Any]] = {}
        self.times: dict[tuple[str, str], float] = {}
        self.raw: dict[str, dict[str, Any]] = {}
        self.feats: list[dict[str, Any]] = []
        self.labels: dict[str, dict[str, Any]] = {}
        self.stats = {"transactions": 0, "chargebacks": 0, "quarantined": 0, "duplicates": 0}

    def _state(self, conn: Connection, kind: str, entity_id: Any) -> dict[str, Any]:
        key = (kind, str(entity_id))
        if key not in self.states:
            stored, _ = featurestore.get(conn, kind, key[1])
            self.states[key] = stored if stored is not None else transforms.NEW[kind]()
        return self.states[key]

    def _touch(self, kind: str, entity_id: Any, t: float) -> None:
        self.times[(kind, str(entity_id))] = t

    def handle(self, conn: Connection, event: dict[str, Any]) -> None:
        if event["event_type"] == "txn.authorised":
            self._transaction(conn, event["data"])
        elif event["event_type"] == "chargeback.filed":
            self._chargeback(conn, event["data"])

    def _transaction(self, conn: Connection, txn: dict[str, Any]) -> None:
        problems = validation.validate_record(self.contract, txn)
        if problems:
            validation.quarantine(conn, "transaction", str(txn.get("txn_id", "?")), problems, txn)
            self.stats["quarantined"] += 1
            return
        tid = txn["txn_id"]
        seen = tid in self.raw or conn.execute(
            select(schema.raw_transactions.c.txn_id).where(schema.raw_transactions.c.txn_id == tid)
        ).first()
        if seen:  # the source re-emitted the event: ingestion is idempotent
            self.stats["duplicates"] += 1
            return
        card = self._state(conn, "card", txn["card_id"])
        device = self._state(conn, "device", txn["device_id"])
        merchant = self._state(conn, "merchant", txn["merchant_id"])
        features = transforms.compute(txn, card, device, merchant)
        transforms.update(txn, card, device, merchant)
        for kind in ("card", "device", "merchant"):
            self._touch(kind, txn[f"{kind}_id"], txn["event_time"])
        self.raw[tid] = {**txn, "ingested_at": db.now()}
        self.feats.append({"txn_id": tid, "event_time": txn["event_time"], "features": db.dumps(features)})
        self.stats["transactions"] += 1

    def _chargeback(self, conn: Connection, cb: dict[str, Any]) -> None:
        tid = cb.get("txn_id", "")
        merchant_id = self.raw[tid]["merchant_id"] if tid in self.raw else conn.execute(
            select(schema.raw_transactions.c.merchant_id).where(schema.raw_transactions.c.txn_id == tid)
        ).scalar()
        if merchant_id is None:
            validation.quarantine(conn, "chargeback", tid, ["txn_id: no such transaction was ingested"], cb)
            self.stats["quarantined"] += 1
            return
        transforms.on_chargeback(self._state(conn, "merchant", merchant_id), float(cb["filed_at"]))
        self._touch("merchant", merchant_id, float(cb["filed_at"]))
        self.labels[tid] = {"txn_id": tid, "is_fraud": 1, "source": "chargeback", "label_time": float(cb["filed_at"])}
        self.stats["chargebacks"] += 1

    def flush(self, conn: Connection) -> None:
        if self.raw:
            conn.execute(insert(schema.raw_transactions), list(self.raw.values()))
            conn.execute(insert(schema.txn_features), self.feats)
        for row in self.labels.values():  # a chargeback outranks an earlier analyst verdict
            db.upsert(conn, schema.labels, {"txn_id": row["txn_id"]},
                      {k: v for k, v in row.items() if k != "txn_id"})
        for (kind, entity_id), t in self.times.items():
            featurestore.put(conn, kind, entity_id, self.states[(kind, entity_id)], t)
        totals, self.raw, self.feats, self.labels, self.times, self.states = self.stats, {}, [], {}, {}, {}
        self.stats = totals


def online_features(conn: Connection, txn: dict[str, Any]) -> dict[str, float]:
    """The scoring path: the same `compute`, fed from the online store."""
    states = []
    for kind in ("card", "device", "merchant"):
        stored, _ = featurestore.get(conn, kind, str(txn[f"{kind}_id"]))
        states.append(stored if stored is not None else transforms.NEW[kind]())
    return transforms.compute(txn, *states)
