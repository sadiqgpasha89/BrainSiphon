"""The source system: a simulated payment switch.

It stands in for the operational system you integrate with. What matters is HOW it is integrated, and that part is real:
the switch writes each business row and an outbox row in one transaction (the transactional-outbox pattern), and the ML
platform only ever reads the outbox through CDC (data/worker.py). To integrate a real switch, keep the outbox contract
(data/contracts/transaction.yaml) and delete this file.

The simulated world plants the traps the blueprint warns about:
  - fraud arrives in bursts from mule devices shared across cards, mostly at a small set of risky merchants
  - labels are delayed: a chargeback is filed 1 to 12 days after the fraud, and about 10% of fraud is never reported
  - genuine look-alikes: travel bursts at new merchants and occasional very large purchases
  - a trickle of malformed events from a legacy channel, which ingestion must quarantine

    python -m data.source_system seed       emit history up to (now - holdback_days)
    python -m data.source_system advance    emit the held-back days (new transactions and newly filed chargebacks)
"""

from __future__ import annotations

import json
import sys
import time
from typing import Any

import numpy as np
from sqlalchemy import insert, select

from bsref import cdc, db
from bsref.config import load_yaml
from data import schema

DAY = 86400.0
COUNTRIES = ["IN", "IN", "IN", "IN", "AE", "SG", "GB", "US"]


def build_world(seed: int, cards: int, days: int, anchor: float) -> list[dict[str, Any]]:
    """Deterministic for (seed, cards, days, anchor): the full, time-ordered list of source events."""
    rng = np.random.default_rng(seed)
    t0 = anchor - days * DAY
    n_merchants = 400
    risky = rng.choice(np.arange(1, n_merchants + 1), size=14, replace=False)
    mules = 900000 + np.arange(12)
    events: list[dict[str, Any]] = []
    n = 0

    def txn(card: int, merchant: int, device: int, amount: float, rail: str, country: str, t: float) -> str:
        nonlocal n
        n += 1
        tid = f"t{seed}-{n:07d}"
        events.append(
            {"t": t, "kind": "txn", "data": {
                "txn_id": tid, "card_id": int(card), "merchant_id": int(merchant), "device_id": int(device),
                "amount": round(float(max(amount, 1.0)), 2), "rail": rail, "country": country, "event_time": round(t, 3)}}
        )
        return tid

    for card in range(1, cards + 1):
        home = rng.choice(np.arange(1, n_merchants + 1), size=int(rng.integers(4, 10)), replace=False)
        mu = rng.normal(3.6, 0.55)
        rate = rng.gamma(2.0, 0.6)
        device = 100000 + card
        country = "IN" if rng.random() < 0.9 else str(rng.choice(COUNTRIES))
        rail = "upi" if rng.random() < 0.45 else "card"
        k = rng.poisson(rate * days)
        times = np.sort(t0 + rng.random(k) * days * DAY)
        new_phone_at = t0 + rng.random() * days * DAY if rng.random() < 0.08 else None  # genuine device change
        for t in times:
            if new_phone_at is not None and t >= new_phone_at:
                device = 500000 + card
            hour = (t % DAY) / 3600
            if hour < 6 and rng.random() < 0.8:  # few genuine night transactions
                t = t - (t % DAY) + rng.uniform(8, 22) * 3600
            m = rng.choice(home) if rng.random() < 0.85 else rng.integers(1, n_merchants + 1)
            amt = rng.lognormal(mu, 0.5) * (8 if rng.random() < 0.01 else 1)  # 1%: a genuine very large purchase
            txn(card, m, device, amt, rail, country, t)
        if rng.random() < 0.05:  # a genuine trip: a burst at unfamiliar merchants abroad, on the cardholder's own device
            ts = t0 + rng.random() * days * DAY
            abroad = str(rng.choice(["AE", "SG", "GB", "US"]))
            for j in range(int(rng.integers(3, 7))):
                txn(card, rng.integers(1, n_merchants + 1), device, rng.lognormal(mu + 0.3, 0.5), "card", abroad,
                    ts + j * rng.uniform(600, 5400))
        if rng.random() < 0.12:  # the card is compromised once
            tc = t0 + rng.uniform(0.02, 1.0) * days * DAY
            tc = tc - (tc % DAY) + (rng.uniform(0, 6) if rng.random() < 0.6 else rng.uniform(0, 24)) * 3600
            # half the attackers reuse a mule device; the others use a fresh one, which looks like a genuine new phone
            mule = int(rng.choice(mules)) if rng.random() < 0.5 else 700000 + card
            for j in range(int(rng.integers(3, 9))):
                m = rng.choice(risky) if rng.random() < 0.65 else rng.integers(1, n_merchants + 1)
                c = str(rng.choice(["AE", "SG", "GB", "US"])) if rng.random() < 0.3 else country
                t = tc + j * rng.uniform(60, 900)
                tid = txn(card, m, mule, rng.lognormal(mu + 1.2, 0.6), rail, c, t)
                if rng.random() < 0.9:  # the rest is never reported: label noise the model has to live with
                    events.append({"t": t + rng.uniform(1, 12) * DAY, "kind": "chargeback",
                                   "data": {"txn_id": tid, "filed_at": 0.0, "reason": "fraud"}})
    for i in range(max(3, len(events) // 500)):  # malformed events from a legacy channel
        t = t0 + rng.random() * days * DAY
        bad = {"txn_id": f"bad{seed}-{i:05d}", "card_id": 1 + i, "merchant_id": 5, "device_id": 7, "amount": 20.0,
               "rail": "card", "country": "IN", "event_time": round(t, 3)}
        bad.update([{"amount": -5.0}, {"rail": "wire"}, {"card_id": None}, {"country": "india"}][i % 4])
        events.append({"t": t, "kind": "malformed", "data": bad})
    events.sort(key=lambda e: e["t"])
    for e in events:
        if e["kind"] == "chargeback":
            e["data"]["filed_at"] = round(e["t"], 3)
    return events


def _emit(events: list[dict[str, Any]]) -> dict[str, int]:
    """Write business rows and their outbox rows in one transaction, in event-time order."""
    counts = {"txn": 0, "chargeback": 0, "malformed": 0}
    with db.tx(db.source_engine()) as conn:
        txns = [e["data"] for e in events if e["kind"] == "txn"]
        cbs = [e["data"] for e in events if e["kind"] == "chargeback"]
        for i in range(0, len(txns), 5000):
            conn.execute(insert(schema.core_transactions), txns[i : i + 5000])
        for i in range(0, len(cbs), 5000):
            conn.execute(insert(schema.core_chargebacks), cbs[i : i + 5000])
        rows = []
        for e in events:
            counts[e["kind"]] += 1
            etype = "chargeback.filed" if e["kind"] == "chargeback" else "txn.authorised"
            rows.append({"aggregate": "payment", "event_type": etype, "key": e["data"]["txn_id"],
                         "payload": db.dumps(e["data"]), "created_at": e["t"]})
        for i in range(0, len(rows), 5000):
            conn.execute(insert(db.outbox), rows[i : i + 5000])
    return counts


def _state(conn) -> dict[str, Any] | None:
    row = conn.execute(select(schema.sim_state.c.state).where(schema.sim_state.c.id == 1)).first()
    return json.loads(row[0]) if row else None


def seed(anchor: float | None = None, **overrides: Any) -> dict[str, Any]:
    cfg = {**load_yaml("configs/pipeline.yaml")["simulation"], **overrides}
    db.init_schema()
    with db.tx(db.source_engine()) as conn:
        if _state(conn):
            raise SystemExit("the source system is already seeded (run `make clean` to start again)")
    anchor = anchor or time.time() // DAY * DAY  # midnight UTC today: the same world for every run on a given seed
    until = anchor - cfg["holdback_days"] * DAY
    events = [e for e in build_world(cfg["seed"], cfg["cards"], cfg["days"], anchor) if e["t"] <= until]
    counts = _emit(events)
    with db.tx(db.source_engine()) as conn:
        conn.execute(insert(schema.sim_state).values(id=1, state=db.dumps({**cfg, "anchor": anchor, "emitted_until": until})))
    return {"emitted": counts, "history_until": until}


def advance() -> dict[str, Any]:
    """Time passes: emit everything between the last emission and the anchor (new traffic, and chargebacks now filed)."""
    with db.tx(db.source_engine()) as conn:
        st = _state(conn)
    if not st:
        raise SystemExit("seed the source system first")
    world = build_world(st["seed"], st["cards"], st["days"], st["anchor"])
    events = [e for e in world if st["emitted_until"] < e["t"] <= st["anchor"]]
    counts = _emit(events)
    with db.tx(db.source_engine()) as conn:
        db.upsert(conn, schema.sim_state, {"id": 1}, {"state": db.dumps({**st, "emitted_until": st["anchor"]})})
    return {"emitted": counts, "history_until": st["anchor"]}


def authorise(txn: dict[str, Any]) -> None:
    """What the switch does when an authorisation is approved: business row + outbox row, atomically."""
    with db.tx(db.source_engine()) as conn:
        conn.execute(insert(schema.core_transactions).values(**txn))
        cdc.append_outbox(conn, "payment", "txn.authorised", txn["txn_id"], txn)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd not in ("seed", "advance"):
        raise SystemExit(__doc__)
    print(json.dumps(seed() if cmd == "seed" else advance(), indent=2))
