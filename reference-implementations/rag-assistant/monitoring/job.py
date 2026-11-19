"""The monitoring job: index freshness, answer quality on the evaluation set, live behaviour, the human loop. Raises alerts.

    python -m monitoring.job

`stale_documents` compares the documents the serving index was built from with the documents ingested now. The evaluation
metrics re-run the whole answer pipeline with the serving index over the CURRENT evaluation set, so an example added by a
writer yesterday is already counted today.
"""

from __future__ import annotations

import json
from typing import Any

import numpy as np
from sqlalchemy import func, select

from bsref import bus, db, observability
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from data import ingest, schema
from serving.answer import Assistant
from training import evalset, train


def stale_documents(conn, manifest: dict[str, Any]) -> int:
    built = manifest["extra"]["documents"]
    now = {r[0]: r[1] for r in conn.execute(select(schema.documents.c.doc_id, schema.documents.c.content_hash))}
    return len({d for d in set(built) | set(now) if built.get(d) != now.get(d)})


def collect() -> dict[str, float]:
    cfg = load_yaml("configs/pipeline.yaml")
    out: dict[str, float] = {}
    with db.tx() as conn:
        out["consumer_lag"] = float(bus.lag(conn, ingest.TOPIC, ingest.GROUP))
        out["dead_letters"] = float(conn.execute(select(func.count()).select_from(db.dead_letters)).scalar_one())
        out["quarantined"] = float(conn.execute(select(func.count()).select_from(db.quarantine)).scalar_one())
        out["reviews_overdue"] = float(conn.execute(select(func.count()).select_from(db.review_tasks).where(
            db.review_tasks.c.status.in_(("open", "claimed")), db.review_tasks.c.due_at < db.now())).scalar_one())
        since = db.now() - 86400
        rows = conn.execute(select(schema.answers.c.status, schema.answers.c.unsupported_sentences, schema.answers.c.latency_ms)
                            .where(schema.answers.c.created_at >= since)).all()
        out["answers"] = float(len(rows))
        if len(rows) >= 20:  # a rate over a handful of questions is noise
            out["abstain_rate"] = sum(r[0] == "abstained" for r in rows) / len(rows)
            answered = max(1, sum(r[0] == "answered" for r in rows))
            out["unsupported_sentence_rate"] = sum(r[1] for r in rows) / answered
            out["answer_p95_ms"] = float(np.percentile([r[2] for r in rows], 95))
        ratings = dict(conn.execute(select(db.feedback.c.label, func.count()).where(
            db.feedback.c.subject_type == "answer", db.feedback.c.source == "user", db.feedback.c.created_at >= since)
            .group_by(db.feedback.c.label)).all())
        if sum(ratings.values()) >= 10:
            out["thumbs_down_rate"] = ratings.get("down", 0) / sum(ratings.values())
        try:
            index, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
        except RegistryError:
            return out
        out["stale_documents"] = float(stale_documents(conn, manifest))
        out["index_age_hours"] = (db.now() - manifest["extra"]["built_at"]) / 3600
        examples = evalset.load(conn)
        out["new_eval_examples"] = float(len(examples) - manifest["extra"]["eval_examples"])
    m, _ = train.evaluate(index, examples, Assistant())
    out.update({f"eval_{k}": v for k, v in m.items() if k != "examples"})
    return out


def run() -> dict[str, Any]:
    db.init_schema()
    values = collect()
    with db.tx() as conn:
        changed = observability.evaluate_alerts(conn, values)
        firing = [a["rule"] for a in observability.firing(conn)]
    return {"metrics": {k: round(v, 5) for k, v in values.items()}, "alerts_changed": changed, "alerts_firing": firing}


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
