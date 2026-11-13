"""Closed-loop re-evaluation: decide whether the agent must be measured again, and if so run the same gated evaluation.

    python -m training.retrain            re-evaluate only if a trigger fires
    python -m training.retrain --force    re-evaluate now

Triggers (configs/pipeline.yaml -> retrain): analysts have labelled enough new cases since the production version was
evaluated, the override rate is above the limit, or the agent configuration in configs/pipeline.yaml differs from the
production version. A re-evaluation registers a new version; it is promoted only if it passes the gates on the grown suite.
If the CURRENT production configuration no longer passes, nothing is promoted and the failed gates are the finding.
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
from training import train


def triggers() -> list[str]:
    cfg = load_yaml("configs/pipeline.yaml")
    r = cfg["retrain"]
    try:
        artefact, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
    except RegistryError:
        return ["no production agent version"]
    with db.tx() as conn:
        n = conn.execute(select(func.count()).select_from(schema.labelled_incidents)).scalar_one()
        override = conn.execute(select(db.metric_snapshots.c.value).where(db.metric_snapshots.c.name == "override_rate")
                                .order_by(db.metric_snapshots.c.id.desc()).limit(1)).scalar()
    reasons = []
    new = n - manifest["extra"]["incidents"]
    if new >= r["min_new_labelled_cases"]:
        reasons.append(f"{new} cases labelled by analysts since the last evaluation")
    if override is not None and override > r["max_override_rate"]:
        reasons.append(f"override rate {override:.2f} above {r['max_override_rate']}")
    if artefact["agent"] != cfg["agent"]:
        reasons.append("the agent configuration changed")
    return reasons


def run(force: bool = False) -> dict[str, Any]:
    db.init_schema()
    reasons = triggers()
    if not reasons and not force:
        return {"evaluated": False, "reasons": []}
    return {"evaluated": True, "reasons": reasons or ["forced"], "result": train.run(by="re-evaluation")}


if __name__ == "__main__":
    print(json.dumps(run("--force" in sys.argv), indent=2))
