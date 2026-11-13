"""Offline feature backfill: rebuild every feature vector by replaying the landed events in time order through the same
transforms. Use it when a feature definition changes (`--write` replaces the logged features and the online states), and as
the parity check that the streaming path and the offline path agree (tests/test_features.py).

    python -m features.backfill            report parity between logged and replayed features
    python -m features.backfill --write    replace the offline feature log and the online store with the replay
"""

from __future__ import annotations

import json
import sys
from typing import Any

import pandas as pd
from sqlalchemy import delete, insert, select

from bsref import db, featurestore
from data import schema
from features import transforms


def replay(conn) -> tuple[pd.DataFrame, dict[tuple[str, str], dict[str, Any]], dict[tuple[str, str], float]]:
    txns = [dict(r) for r in conn.execute(select(schema.raw_transactions)).mappings()]
    cbs = conn.execute(
        select(schema.labels.c.txn_id, schema.labels.c.label_time).where(schema.labels.c.source == "chargeback")
    ).all()
    merchant_of = {t["txn_id"]: t["merchant_id"] for t in txns}
    timeline = [(t["event_time"], 0, t) for t in txns] + [(lt, 1, {"txn_id": tid}) for tid, lt in cbs]
    timeline.sort(key=lambda e: (e[0], e[1]))
    states: dict[tuple[str, str], dict[str, Any]] = {}
    times: dict[tuple[str, str], float] = {}

    def state(kind: str, entity_id: Any) -> dict[str, Any]:
        return states.setdefault((kind, str(entity_id)), transforms.NEW[kind]())

    rows = []
    for t, is_cb, ev in timeline:
        if is_cb:
            transforms.on_chargeback(state("merchant", merchant_of[ev["txn_id"]]), t)
            times[("merchant", str(merchant_of[ev["txn_id"]]))] = t
            continue
        s = [state(k, ev[f"{k}_id"]) for k in ("card", "device", "merchant")]
        rows.append({"txn_id": ev["txn_id"], "event_time": t, **transforms.compute(ev, *s)})
        transforms.update(ev, *s)
        for k in ("card", "device", "merchant"):
            times[(k, str(ev[f"{k}_id"]))] = t
    return pd.DataFrame(rows), states, times


def logged(conn) -> pd.DataFrame:
    rows = conn.execute(select(schema.txn_features)).all()
    return pd.DataFrame([{"txn_id": r[0], "event_time": r[1], **json.loads(r[2])} for r in rows])


def parity(conn) -> dict[str, Any]:
    a = logged(conn).set_index("txn_id").sort_index()
    b = replay(conn)[0].set_index("txn_id").sort_index()
    cols = [c for c in a.columns if c != "event_time"]
    diff = (a[cols] - b.loc[a.index, cols]).abs().max()
    return {"rows": len(a), "max_abs_difference": float(diff.max()), "worst_feature": str(diff.idxmax())}


def write(conn) -> int:
    frame, states, times = replay(conn)
    conn.execute(delete(schema.txn_features))
    cols = [c for c in frame.columns if c not in ("txn_id", "event_time")]
    recs = [{"txn_id": r["txn_id"], "event_time": r["event_time"], "features": db.dumps({c: r[c] for c in cols})}
            for r in frame.to_dict(orient="records")]
    for i in range(0, len(recs), 5000):
        conn.execute(insert(schema.txn_features), recs[i : i + 5000])
    conn.execute(delete(db.online_features))
    for (kind, entity_id), st in states.items():
        featurestore.put(conn, kind, entity_id, st, times[(kind, entity_id)])
    return len(recs)


if __name__ == "__main__":
    with db.tx() as c:
        print(json.dumps({"rewritten": write(c)} if "--write" in sys.argv else parity(c), indent=2))
