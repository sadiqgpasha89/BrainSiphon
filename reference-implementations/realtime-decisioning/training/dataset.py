"""Assemble the training set from the offline feature log and the labels, respecting label maturity.

Only transactions older than the maturity window are eligible, for BOTH classes. Inside the window a transaction with no
chargeback is not yet "genuine" (treating it as such teaches the model that recent fraud is fine), and taking only the
already-confirmed frauds from the window is just as wrong: the newest slice of the data would then contain positives and no
negatives, and every metric computed on it would be meaningless. An eligible row is positive when a fraud label exists and
negative otherwise; an analyst verdict overrides the default in either direction.
"""

from __future__ import annotations

import json
from typing import Any

import pandas as pd
from sqlalchemy import func, select

from bsref import featurestore
from data import schema

DAY = 86400.0


def watermark(conn) -> float:
    """The pipeline's clock: the newest event time landed. Using event time (not wall time) makes every run reproducible."""
    return float(conn.execute(select(func.max(schema.raw_transactions.c.event_time))).scalar() or 0.0)


def build(conn, cfg: dict[str, Any], as_of: float | None = None) -> tuple[pd.DataFrame, list[str]]:
    as_of = as_of or watermark(conn)
    names = featurestore.feature_names(cfg["feature_view"])
    rows = conn.execute(
        select(schema.txn_features.c.txn_id, schema.txn_features.c.event_time, schema.txn_features.c.features)
        .where(schema.txn_features.c.event_time <= as_of)
    ).all()
    lab = {
        tid: (int(f), float(t))
        for tid, f, t in conn.execute(select(schema.labels.c.txn_id, schema.labels.c.is_fraud, schema.labels.c.label_time))
        if t <= as_of  # a label that did not exist yet at `as_of` must not be used
    }
    mature_before = as_of - cfg["labels"]["maturity_days"] * DAY
    warm_from = min((r[1] for r in rows), default=0.0) + cfg["labels"].get("burn_in_days", 0) * DAY
    out = []
    for tid, t, feats in rows:
        if t > mature_before or t < warm_from:
            continue  # labels for this row are not complete yet
        label = lab[tid][0] if tid in lab else 0
        out.append({"txn_id": tid, "event_time": t, "label": label, **json.loads(feats)})
    return pd.DataFrame(out, columns=["txn_id", "event_time", "label", *names]), names


def split(df: pd.DataFrame, cfg: dict[str, Any]) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Chronological train / validation / test. The boundaries are event times, so no future row can reach training."""
    end = df["event_time"].max()
    test_from = end - cfg["split"]["test_days"] * DAY
    val_from = test_from - cfg["split"]["validation_days"] * DAY
    train = df[df["event_time"] < val_from]
    val = df[(df["event_time"] >= val_from) & (df["event_time"] < test_from)]
    test = df[df["event_time"] >= test_from]
    return train, val, test
