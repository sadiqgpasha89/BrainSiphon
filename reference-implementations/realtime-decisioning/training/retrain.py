"""Closed-loop retraining: decide whether a new model is due, and if so run the same gated training pipeline.

    python -m training.retrain            retrain only if a trigger fires
    python -m training.retrain --force    retrain now

Triggers (configs/pipeline.yaml -> retrain): enough new fraud labels since the production model was trained (chargebacks,
analyst verdicts, failed step-ups), the model is older than the limit, or the last monitoring run saw feature drift above
the limit. The retrained model is promoted only if it passes the gates and does not regress against production.
"""

from __future__ import annotations

import json
import sys
from typing import Any

from sqlalchemy import func, select

from bsref import db
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from data import schema
from training import dataset, train

DAY = 86400.0


def triggers() -> list[str]:
    cfg = load_yaml("configs/pipeline.yaml")
    r = cfg["retrain"]
    try:
        _, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
    except RegistryError:
        return ["no production model"]
    as_of = manifest["extra"]["as_of"]
    reasons = []
    with db.tx() as conn:
        new_labels = conn.execute(
            select(func.count()).select_from(schema.labels).where(schema.labels.c.is_fraud == 1, schema.labels.c.label_time > as_of)
        ).scalar_one()
        age = (dataset.watermark(conn) - as_of) / DAY
        psi = conn.execute(
            select(db.metric_snapshots.c.value).where(db.metric_snapshots.c.name == "max_feature_psi")
            .order_by(db.metric_snapshots.c.id.desc()).limit(1)
        ).scalar()
    if new_labels >= r["min_new_labels"]:
        reasons.append(f"{new_labels} new fraud labels since training (trigger: {r['min_new_labels']})")
    if age >= r["max_model_age_days"]:
        reasons.append(f"model is {age:.1f} days old (limit: {r['max_model_age_days']})")
    if psi is not None and psi > r["max_feature_psi"]:
        reasons.append(f"feature PSI {psi:.3f} above {r['max_feature_psi']}")
    return reasons


def run(force: bool = False) -> dict[str, Any]:
    db.init_schema()
    reasons = triggers()
    if not reasons and not force:
        return {"retrained": False, "reasons": []}
    return {"retrained": True, "reasons": reasons or ["forced"], "result": train.run(by="retrain")}


if __name__ == "__main__":
    print(json.dumps(run("--force" in sys.argv), indent=2))
