"""The source system: a simulated ERP / point-of-sale system for 8 stores and 25 products.

The integration is the real part: each closed sales day, each later restatement and each planned promotion is written with
an outbox row in the same transaction, and the ML platform reads only the outbox through CDC (data/worker.py). To integrate a
real ERP, keep the contract (data/contracts/sales_day.yaml) and delete this file.

Traps planted in the data, each named in the blueprint:
  - promotions lift sales 1.6x to 2.6x, so the recent average is inflated right after one
  - stock-outs censor demand: recorded sales of 0 on a stock-out day are not zero demand
  - restatements: about 1% of days are corrected one to three days later (CDC updates, not inserts)
  - late feeds: a few series report their newest days late
  - a trickle of malformed rows

    python -m data.source_system seed       emit history up to (today - holdback_days)
    python -m data.source_system advance    emit the held-back days
"""

from __future__ import annotations

import json
import sys
import time
from datetime import date, timedelta
from typing import Any

import numpy as np
from sqlalchemy import insert, select

from bsref import db
from bsref.config import load_yaml
from data import schema

DAY = 86400.0


def build_world(seed: int, stores: int, skus: int, days: int, anchor_day: date) -> list[dict[str, Any]]:
    """Deterministic for its arguments: the time-ordered list of source events. `t` is the simulated emission day index."""
    rng = np.random.default_rng(seed)
    start = anchor_day - timedelta(days=days)
    events: list[dict[str, Any]] = []
    store_dow = rng.normal(1.0, 0.12, size=(stores, 7)).clip(0.6, 1.5)
    store_dow[:, 5:] *= rng.uniform(1.15, 1.6, size=(stores, 1))  # weekends are busier
    n_bad = 0
    for s in range(stores):
        for k in range(skus):
            sid, sku = f"S{s + 1:03d}", f"K{k + 1:04d}"
            level = float(rng.lognormal(2.6, 0.7))
            price = round(float(rng.uniform(2, 60)), 2)
            phase, amp = rng.uniform(0, 2 * np.pi), rng.uniform(0.0, 0.25)
            trend = rng.normal(0.0, 0.0006)
            late = rng.random() < 0.03  # this series reports its newest days late
            promo = np.zeros(days + 30, dtype=bool)
            d = int(rng.integers(5, 40))
            while d < days + 30:
                length = int(rng.integers(3, 8))
                promo[d : d + length] = True
                d += length + int(rng.integers(30, 90))
            uplift = rng.uniform(1.6, 2.6)
            for i in range(days + 30):
                if promo[i]:  # the promotion plan is published three weeks ahead
                    events.append({"t": i - 21, "kind": "promo",
                                   "data": {"store_id": sid, "sku": sku, "day": str(start + timedelta(days=i))}})
            for i in range(days):
                day = start + timedelta(days=i)
                mean = level * store_dow[s, day.weekday()] * (1 + amp * np.sin(2 * np.pi * day.timetuple().tm_yday / 365.25 + phase))
                mean *= (1 + trend) ** i * (uplift if promo[i] else 1.0)
                stockout = rng.random() < 0.02
                units = int(rng.poisson(mean * rng.gamma(12.0, 1 / 12.0)))
                if stockout:
                    units = int(units * rng.uniform(0.0, 0.3))
                row = {"store_id": sid, "sku": sku, "day": str(day), "units": units, "on_promo": bool(promo[i]),
                       "stockout": bool(stockout), "price": price}
                emit_at = i + (2 if late and i >= days - 40 else 0)
                events.append({"t": emit_at, "kind": "sale", "data": row})
                if rng.random() < 0.01:
                    fixed = {**row, "units": max(0, int(units * rng.uniform(0.6, 1.5)) + 1)}
                    events.append({"t": emit_at + int(rng.integers(1, 4)), "kind": "restate", "data": fixed})
                if rng.random() < 0.0015:
                    n_bad += 1
                    bad = {**row, "day": str(day), **[{"units": -3}, {"store_id": "store-9"}, {"price": 0}][n_bad % 3]}
                    events.append({"t": emit_at, "kind": "malformed", "data": bad})
    order = {"promo": 0, "sale": 1, "malformed": 1, "restate": 2}
    events.sort(key=lambda e: (e["t"], order[e["kind"]], e["data"]["store_id"], e["data"]["sku"], e["data"]["day"]))
    return events


TYPE = {"sale": "sales.day_closed", "malformed": "sales.day_closed", "restate": "sales.restated", "promo": "promo.planned"}


def _emit(events: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"sale": 0, "restate": 0, "promo": 0, "malformed": 0}
    with db.tx(db.source_engine()) as conn:
        sales = [e["data"] for e in events if e["kind"] == "sale"]
        for i in range(0, len(sales), 5000):
            conn.execute(insert(schema.core_sales), sales[i : i + 5000])
        for e in events:
            if e["kind"] == "restate":
                d = e["data"]
                conn.execute(schema.core_sales.update().where(
                    schema.core_sales.c.store_id == d["store_id"], schema.core_sales.c.sku == d["sku"],
                    schema.core_sales.c.day == d["day"]).values(units=d["units"]))
        rows = []
        for e in events:
            counts[e["kind"]] += 1
            d = e["data"]
            rows.append({"aggregate": "sales", "event_type": TYPE[e["kind"]], "key": f"{d['store_id']}:{d['sku']}:{d['day']}",
                         "payload": db.dumps(d), "created_at": float(e["t"])})
        for i in range(0, len(rows), 5000):
            conn.execute(insert(db.outbox), rows[i : i + 5000])
    return counts


def _state(conn) -> dict[str, Any] | None:
    row = conn.execute(select(schema.sim_state.c.state).where(schema.sim_state.c.id == 1)).first()
    return json.loads(row[0]) if row else None


def seed(anchor_day: date | None = None, **overrides: Any) -> dict[str, Any]:
    cfg = {**load_yaml("configs/pipeline.yaml")["simulation"], **overrides}
    db.init_schema()
    with db.tx(db.source_engine()) as conn:
        if _state(conn):
            raise SystemExit("the source system is already seeded (run `make clean` to start again)")
    anchor_day = anchor_day or date.fromtimestamp(time.time() // DAY * DAY)
    until = cfg["days"] - cfg["holdback_days"]  # emission-day index
    world = build_world(cfg["seed"], cfg["stores"], cfg["skus"], cfg["days"], anchor_day)
    counts = _emit([e for e in world if e["t"] < until])
    with db.tx(db.source_engine()) as conn:
        conn.execute(insert(schema.sim_state).values(id=1, state=db.dumps({**cfg, "anchor_day": str(anchor_day), "emitted_until": until})))
    return {"emitted": counts, "history_until": str(anchor_day - timedelta(days=cfg["holdback_days"] + 1))}


def advance(days: int | None = None) -> dict[str, Any]:
    """Time passes: emit the next `days` simulated days (default: everything held back)."""
    with db.tx(db.source_engine()) as conn:
        st = _state(conn)
    if not st:
        raise SystemExit("seed the source system first")
    until = min(st["days"], st["emitted_until"] + days) if days else st["days"]
    anchor = date.fromisoformat(st["anchor_day"])
    world = build_world(st["seed"], st["stores"], st["skus"], st["days"], anchor)
    counts = _emit([e for e in world if st["emitted_until"] <= e["t"] < until])
    with db.tx(db.source_engine()) as conn:
        db.upsert(conn, schema.sim_state, {"id": 1}, {"state": db.dumps({**st, "emitted_until": until})})
    return {"emitted": counts, "history_until": str(anchor - timedelta(days=st["days"] - until + 1))}


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd not in ("seed", "advance"):
        raise SystemExit(__doc__)
    arg = int(sys.argv[2]) if len(sys.argv) > 2 else None
    print(json.dumps(seed() if cmd == "seed" else advance(arg), indent=2))
