"""The monitoring job: data freshness, live accuracy against actuals, band calibration, drift, the human loop. Raises alerts.

    python -m monitoring.job

A forecast can only be judged once its target days have happened, so "live accuracy" joins every published forecast with the
actuals that have arrived since (stock-out days excluded) and compares it with the backtest the model was promoted on.
"""

from __future__ import annotations

import json
from datetime import date
from typing import Any

from sqlalchemy import func, select

from api import service
from bsref import bus, db, drift, featurestore, observability
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from data import ingest, schema
from features.build import build, load_panel


def collect() -> dict[str, float]:
    cfg = load_yaml("configs/pipeline.yaml")
    out: dict[str, float] = {}
    with db.tx() as conn:
        out["consumer_lag"] = float(bus.lag(conn, ingest.TOPIC, ingest.GROUP))
        out["dead_letters"] = float(conn.execute(select(func.count()).select_from(db.dead_letters)).scalar_one())
        landed = conn.execute(select(func.count()).select_from(schema.sales_daily)).scalar_one()
        bad = conn.execute(select(func.count()).select_from(db.quarantine)).scalar_one()
        out["quarantine_rate"] = bad / max(1, landed + bad)
        out["restated_rows"] = float(conn.execute(
            select(func.count()).select_from(schema.sales_daily).where(schema.sales_daily.c.restated == 1)).scalar_one())
        out["reviews_overdue"] = float(conn.execute(select(func.count()).select_from(db.review_tasks).where(
            db.review_tasks.c.status.in_(("open", "claimed")), db.review_tasks.c.due_at < db.now())).scalar_one())
        panel = load_panel(conn, cfg["horizon_days"])
        newest = panel.days[panel.last_observed]
        out["origin_completeness"] = panel.completeness(panel.last_observed)
        run = service.latest_run(conn)
        if run:
            out["days_since_last_run"] = float((newest - date.fromisoformat(run["origin_day"])).days)
            out["held_share_last_run"] = run["held"] / max(1, run["series"])
        acc = service.accuracy(conn)
        try:
            model, manifest = Registry(settings().registry_dir).load(cfg["model_name"])
        except RegistryError:
            return out
        out["model_age_days"] = float((newest - date.fromisoformat(manifest["extra"]["trained_through"])).days)
        if acc.get("rows", 0) >= 500:
            out["live_wape"], out["live_baseline_wape"] = acc["wape_final"], acc["wape_baseline"]
            out["live_forecast_value_added"] = 1 - acc["wape_final"] / acc["wape_baseline"]
            out["live_wape_ratio"] = acc["wape_final"] / manifest["metrics"]["wape"]
            out["live_coverage"], out["live_bias"] = acc["coverage_p10_p90"], acc["bias"]
            out["live_coverage_gap"] = abs(acc["coverage_p10_p90"] - 0.80)
            out["live_rows"] = float(acc["rows"])
            if "override_wape" in acc:
                out["override_wape_delta"] = acc["override_wape"] - acc["override_model_wape"]
        names = featurestore.feature_names(cfg["feature_view"])
        current = build(panel, panel.last_observed, cfg["horizon_days"], names)
        psi = drift.report(manifest["extra"]["drift_reference"], {n: current[n].to_numpy(dtype=float) for n in names
                                                                  if n not in ("year_sin", "year_cos")})  # calendar moves by design
        worst = max(psi, key=psi.get)
        out["max_feature_psi"] = psi[worst]
        out["_worst_feature"] = worst  # type: ignore[assignment]
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
