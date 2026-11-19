"""The nightly forecast run (batch inference).

    python -m serving.batch

1. choose the origin: the newest day for which enough series have reported (late feeds must not silently bias the run)
2. validate the input window against its contract; stop on failure
3. build features for every series and horizon, predict p10 / p50 / p90 with the production model
4. sanity-check each series against its own recent sales; an implausible forecast is HELD for a planner and consumers get the
   seasonal-naive baseline for it until the planner decides
5. write the run and its forecasts in one transaction. The run id is (origin, model version): running twice changes nothing.
"""

from __future__ import annotations

import json
from typing import Any

import pandas as pd
from sqlalchemy import insert, select

from bsref import db, featurestore, hitl, validation
from bsref.config import load_yaml, settings
from bsref.registry import Registry
from data import schema
from features.build import build, load_panel

REVIEW_KIND = "forecast-hold"


def run(started_by: str = "scheduler") -> dict[str, Any]:
    cfg = load_yaml("configs/pipeline.yaml")
    h, names = cfg["horizon_days"], featurestore.feature_names(cfg["feature_view"])
    model, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
    if list(model.features) != names:
        raise validation.DataValidationError("the production model's inputs differ from features/definitions.yaml: retrain")
    with db.tx() as conn:
        panel = load_panel(conn, h)
        origin = next((i for i in range(panel.last_observed, panel.last_observed - 3, -1)
                       if panel.completeness(i) >= cfg["data"]["min_origin_completeness"]), None)
        if origin is None:
            raise validation.DataValidationError(
                f"fewer than {cfg['data']['min_origin_completeness']:.0%} of series reported in the last 3 days: run refused")
        origin_day = str(panel.days[origin])
        run_id = f"{origin_day}_{manifest['version']}"
        prior = conn.execute(select(schema.forecast_runs).where(schema.forecast_runs.c.run_id == run_id)).mappings().first()
        if prior:
            return {**dict(prior), "replayed": True}
        window = str(panel.days[origin - cfg["data"]["history_days"]])
        hist = pd.DataFrame(conn.execute(
            select(schema.sales_daily.c.store_id, schema.sales_daily.c.sku, schema.sales_daily.c.day, schema.sales_daily.c.units)
            .where(schema.sales_daily.c.day > window, schema.sales_daily.c.day <= origin_day)).mappings().all())
        _, report = validation.validate_frame(load_yaml("data/contracts/forecast_input.yaml"), hist)
        report.raise_if_failed()

        df = build(panel, origin, h, names)
        df = pd.concat([df, model.predict(df)], axis=1)
        totals = df.groupby(["store_id", "sku"]).agg(p50=("p50", "sum"), level=("level", "first"))
        totals["ratio"] = totals["p50"] / (totals["level"] * h)
        r = cfg["review"]
        held = totals[(totals["ratio"] > r["max_ratio_to_recent"]) | (totals["ratio"] < r["min_ratio_to_recent"])]
        held_keys = set(held.index)
        rows = []
        for rec in df.to_dict(orient="records"):
            is_held = (rec["store_id"], rec["sku"]) in held_keys
            rows.append({
                "run_id": run_id, "store_id": rec["store_id"], "sku": rec["sku"], "target_day": rec["target_day"],
                "horizon": int(rec["horizon"]), "p10": round(rec["p10"], 3), "p50": round(rec["p50"], 3), "p90": round(rec["p90"], 3),
                "baseline": round(rec["baseline"], 3), "final": round(rec["baseline"] if is_held else rec["p50"], 3),
                "status": "held" if is_held else "published", "decided_by": None,
            })
        for i in range(0, len(rows), 5000):
            conn.execute(insert(schema.forecasts), rows[i : i + 5000])
        for (store, sku), t in held.iterrows():
            hitl.create_task(
                conn, REVIEW_KIND, f"{run_id}:{store}:{sku}",
                {"run_id": run_id, "store_id": store, "sku": sku, "forecast_14d": round(float(t["p50"]), 1),
                 "recent_14d": round(float(t["level"] * h), 1), "ratio": round(float(t["ratio"]), 2)},
                requested_by="forecast-run", priority=min(99, int(abs(t["ratio"] - 1) * 30)), sla_seconds=r["sla_seconds"])
        summary = {"run_id": run_id, "origin_day": origin_day, "model_version": manifest["version"], "status": "complete",
                   "series": int(len(totals)), "held": int(len(held)), "completeness": round(panel.completeness(origin), 4),
                   "started_by": started_by, "created_at": db.now()}
        conn.execute(insert(schema.forecast_runs).values(**summary))
        db.audit(conn, started_by, "forecast.run", run_id, {"series": summary["series"], "held": summary["held"]})
    return {**summary, "replayed": False, "quarantined_input_rows": report.bad_rows}


if __name__ == "__main__":
    db.init_schema()
    print(json.dumps(run(), indent=2, default=str))
