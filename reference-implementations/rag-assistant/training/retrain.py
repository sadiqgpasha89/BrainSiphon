"""Closed-loop re-indexing: decide whether a new index is due, and if so build, evaluate and (gated) promote it.

    python -m training.retrain            rebuild only if a trigger fires
    python -m training.retrain --force    rebuild now

Triggers (configs/pipeline.yaml -> reindex): documents changed since the production index was built, or writers added
evaluation examples since then (the index should be re-measured against what production taught us).
"""

from __future__ import annotations

import json
import sys
from typing import Any

from bsref import db
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from monitoring.job import stale_documents
from training import evalset, train


def triggers() -> list[str]:
    cfg = load_yaml("configs/pipeline.yaml")
    r = cfg["reindex"]
    try:
        _, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
    except RegistryError:
        return ["no production index"]
    with db.tx() as conn:
        stale = stale_documents(conn, manifest)
        new_examples = len(evalset.load(conn)) - manifest["extra"]["eval_examples"]
    reasons = []
    if stale >= r["min_changed_documents"]:
        reasons.append(f"{stale} documents changed since the index was built")
    if new_examples >= r["min_new_eval_examples"]:
        reasons.append(f"{new_examples} new evaluation examples from reviews")
    return reasons


def run(force: bool = False) -> dict[str, Any]:
    db.init_schema()
    reasons = triggers()
    if not reasons and not force:
        return {"rebuilt": False, "reasons": []}
    return {"rebuilt": True, "reasons": reasons or ["forced"], "result": train.run(by="reindex")}


if __name__ == "__main__":
    print(json.dumps(run("--force" in sys.argv), indent=2))
