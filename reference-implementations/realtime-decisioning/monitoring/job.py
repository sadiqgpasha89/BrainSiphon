"""The monitoring job: compute the health of the data, the model and the operation, store the values, raise alerts.

    python -m monitoring.job

Layers measured: ingestion (lag, dead letters, contract violations), serving (fallback rate, latency, decision mix), model
inputs (PSI of every feature and of the score against the training reference), model quality on delayed ground truth
(PR-AUC on the newest matured labels) and the human loop (overdue reviews, how often analysts overturn a block).
Schedule it every few minutes (infrastructure/k8s/cronjobs.yaml). The same numbers are exposed as gauges for Prometheus.
"""

from __future__ import annotations

import json
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score
from sqlalchemy import func, select

from bsref import bus, db, drift, observability
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from data import ingest, schema
from training import dataset

DAY = 86400.0


def collect() -> dict[str, float]:
    cfg = load_yaml("configs/pipeline.yaml")
    out: dict[str, float] = {}
    with db.tx() as conn:
        out["consumer_lag"] = float(bus.lag(conn, ingest.TOPIC, ingest.GROUP))
        out["dead_letters"] = float(conn.execute(select(func.count()).select_from(db.dead_letters)).scalar_one())
        landed = conn.execute(select(func.count()).select_from(schema.raw_transactions)).scalar_one()
        bad = conn.execute(select(func.count()).select_from(db.quarantine)).scalar_one()
        out["quarantine_rate"] = bad / max(1, landed + bad)
        since = db.now() - cfg["monitoring"]["window_hours"] * 3600
        rows = conn.execute(
            select(schema.decisions.c.action, schema.decisions.c.fallback, schema.decisions.c.latency_ms)
            .where(schema.decisions.c.created_at >= since)
        ).all()
        out["decisions"] = float(len(rows))
        if len(rows) >= 50:  # a rate over a handful of decisions is noise, not a signal
            n = len(rows)
            out["block_rate"] = sum(r[0] == "BLOCK" for r in rows) / n
            out["step_up_rate"] = sum(r[0] == "STEP_UP" for r in rows) / n
            out["fallback_rate"] = sum(r[1] for r in rows) / n
            out["scoring_p99_ms"] = float(np.percentile([r[2] for r in rows], 99))
        out["reviews_overdue"] = float(
            conn.execute(
                select(func.count()).select_from(db.review_tasks).where(
                    db.review_tasks.c.status.in_(("open", "claimed")), db.review_tasks.c.due_at < db.now())
            ).scalar_one()
        )
        closed = conn.execute(
            select(db.review_tasks.c.status, func.count()).where(
                db.review_tasks.c.status.in_(("approved", "rejected")), db.review_tasks.c.closed_at >= since)
            .group_by(db.review_tasks.c.status)
        ).all()
        verdicts = dict(closed)
        if sum(verdicts.values()) >= 5:  # too few verdicts say nothing
            out["block_overturn_rate"] = verdicts.get("rejected", 0) / sum(verdicts.values())

        try:
            model, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
        except RegistryError:
            return out
        now_t = dataset.watermark(conn)
        out["model_age_days"] = (now_t - manifest["extra"]["as_of"]) / DAY
        names = model.features
        recent = conn.execute(
            select(schema.txn_features.c.features).where(schema.txn_features.c.event_time > now_t - 7 * DAY)
        ).scalars().all()
        if len(recent) >= 500:
            frame = pd.DataFrame([json.loads(r) for r in recent])[names]
            current = {n: frame[n].to_numpy(dtype=float) for n in names}
            current["__score__"] = model.score(frame.to_numpy(dtype=float))
            psi = drift.report(manifest["extra"]["drift_reference"], current)
            out["score_psi"] = psi.pop("__score__")
            worst = max(psi, key=psi.get)
            out["max_feature_psi"] = psi[worst]
            out["_worst_feature"] = worst  # type: ignore[assignment]
        # delayed ground truth: the newest labels that have matured since the model was trained
        labelled, _ = dataset.build(conn, cfg, now_t)
        fresh = labelled[labelled["event_time"] > manifest["extra"]["as_of"] - cfg["labels"]["maturity_days"] * DAY]
        if len(fresh) >= 500 and fresh["label"].sum() >= 5:
            out["matured_pr_auc"] = float(
                average_precision_score(fresh["label"], model.score(fresh[names].to_numpy(dtype=float))))
            out["matured_rows"] = float(len(fresh))
    return out


def run() -> dict[str, Any]:
    db.init_schema()
    values = collect()
    worst = values.pop("_worst_feature", None)
    with db.tx() as conn:
        changed = observability.evaluate_alerts(conn, values)
        firing = [a["rule"] for a in observability.firing(conn)]
    return {"metrics": {k: round(v, 5) for k, v in values.items()}, "worst_drift_feature": worst,
            "alerts_changed": changed, "alerts_firing": firing}


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
