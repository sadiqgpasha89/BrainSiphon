"""Closed-loop retraining: decide whether a new model is due, and if so run the same gated backtest.

    python -m training.retrain            retrain only if a trigger fires
    python -m training.retrain --force    retrain now

Triggers (configs/pipeline.yaml -> retrain): enough new sales days since the production model was trained, the model is
older than the limit, or live error (forecasts against the actuals that arrived) is well above the backtest error.
"""

from __future__ import annotations

import json
import sys
from datetime import date
from typing import Any

from sqlalchemy import func, select

from bsref import db
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from data import schema
from training import train


def triggers() -> list[str]:
    cfg = load_yaml("configs/pipeline.yaml")
    r = cfg["retrain"]
    try:
        _, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
    except RegistryError:
        return ["no production model"]
    with db.tx() as conn:
        newest = conn.execute(select(func.max(schema.sales_daily.c.day))).scalar()
        ratio = conn.execute(select(db.metric_snapshots.c.value).where(db.metric_snapshots.c.name == "live_wape_ratio")
                             .order_by(db.metric_snapshots.c.id.desc()).limit(1)).scalar()
    age = (date.fromisoformat(newest) - date.fromisoformat(manifest["extra"]["trained_through"])).days
    reasons = []
    if age >= r["max_model_age_days"]:
        reasons.append(f"model is {age} days old (limit: {r['max_model_age_days']})")
    elif age >= r["min_new_days"]:
        reasons.append(f"{age} new sales days since training (trigger: {r['min_new_days']})")
    if ratio is not None and ratio > r["max_live_wape_ratio"]:
        reasons.append(f"live WAPE is {ratio:.2f}x the backtest WAPE (limit: {r['max_live_wape_ratio']})")
    return reasons


def run(force: bool = False) -> dict[str, Any]:
    db.init_schema()
    reasons = triggers()
    if not reasons and not force:
        return {"retrained": False, "reasons": []}
    return {"retrained": True, "reasons": reasons or ["forced"], "result": train.run(by="retrain")}


if __name__ == "__main__":
    print(json.dumps(run("--force" in sys.argv), indent=2))
