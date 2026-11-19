"""Business logic behind the API: reading forecasts, planner decisions, accuracy against actuals."""

from __future__ import annotations

from typing import Any

import numpy as np
from sqlalchemy import select, update
from sqlalchemy.engine import Connection

from bsref import db, feedback, hitl
from data import schema

F, S = schema.forecasts, schema.sales_daily


def latest_run(conn: Connection) -> dict[str, Any] | None:
    row = conn.execute(select(schema.forecast_runs).order_by(schema.forecast_runs.c.origin_day.desc(),
                                                              schema.forecast_runs.c.created_at.desc()).limit(1)).mappings().first()
    return dict(row) if row else None


def get_forecasts(conn: Connection, store_id: str, sku: str, run_id: str | None) -> dict[str, Any] | None:
    run = run_id or (latest_run(conn) or {}).get("run_id")
    rows = conn.execute(select(F).where(F.c.run_id == run, F.c.store_id == store_id, F.c.sku == sku).order_by(F.c.target_day)
                        ).mappings().all()
    if not rows:
        return None
    return {"run_id": run, "store_id": store_id, "sku": sku, "status": rows[0]["status"],
            "days": [{k: r[k] for k in ("target_day", "horizon", "final", "p10", "p50", "p90", "baseline")} for r in rows]}


def _apply(conn: Connection, run_id: str, store: str, sku: str, verdict: str, factor: float, actor: str, notes: str) -> None:
    where = (F.c.run_id == run_id, F.c.store_id == store, F.c.sku == sku)
    if verdict == "accept_model":
        conn.execute(update(F).where(*where).values(final=F.c.p50, status="published", decided_by=actor))
    elif verdict == "keep_baseline":
        conn.execute(update(F).where(*where).values(final=F.c.baseline, status="published", decided_by=actor))
    else:
        conn.execute(update(F).where(*where).values(final=F.c.p50 * factor, status="overridden", decided_by=actor))
    feedback.record(conn, "forecast", f"{run_id}:{store}:{sku}", "planner", verdict, actor, {"factor": factor, "notes": notes})


def resolve_review(conn: Connection, task_id: int, verdict: str, factor: float, actor: str, notes: str, request_id: str) -> dict[str, Any]:
    task = hitl.decide(conn, task_id, actor, "reject" if verdict == "keep_baseline" else "approve", notes)
    p = task["payload"]
    _apply(conn, p["run_id"], p["store_id"], p["sku"], verdict, factor, actor, notes)
    db.audit(conn, actor, "forecast.review", task["subject_id"], {"verdict": verdict, "factor": factor}, request_id)
    return task


def override(conn: Connection, store: str, sku: str, factor: float, actor: str, notes: str, request_id: str) -> dict[str, Any] | None:
    """A planner knows something the model does not (a competitor closing, a local event): scale the latest forecast."""
    run = latest_run(conn)
    if not run or not get_forecasts(conn, store, sku, run["run_id"]):
        return None
    _apply(conn, run["run_id"], store, sku, "override", factor, actor, notes)
    db.audit(conn, actor, "forecast.override", f"{run['run_id']}:{store}:{sku}", {"factor": factor, "notes": notes}, request_id)
    return get_forecasts(conn, store, sku, run["run_id"])


def accuracy(conn: Connection, run_id: str | None = None) -> dict[str, Any]:
    """Forecasts joined with the actuals that have arrived since. Stock-out days are excluded (their demand is unknown)."""
    q = select(F.c.final, F.c.p10, F.c.p50, F.c.p90, F.c.baseline, F.c.status, S.c.units).select_from(
        F.join(S, (F.c.store_id == S.c.store_id) & (F.c.sku == S.c.sku) & (F.c.target_day == S.c.day))
    ).where(S.c.stockout.is_(False))
    if run_id:
        q = q.where(F.c.run_id == run_id)
    rows = conn.execute(q).all()
    if not rows:
        return {"rows": 0}
    a = np.array([r[6] for r in rows], dtype=float)
    col = {name: np.array([r[i] for r in rows], dtype=float) for i, name in enumerate(("final", "p10", "p50", "p90", "baseline"))}
    total = max(a.sum(), 1e-9)
    out = {"rows": len(rows), "wape_final": float(np.abs(a - col["final"]).sum() / total),
           "wape_model": float(np.abs(a - col["p50"]).sum() / total), "wape_baseline": float(np.abs(a - col["baseline"]).sum() / total),
           "bias": float((col["final"] - a).sum() / total), "coverage_p10_p90": float(((a >= col["p10"]) & (a <= col["p90"])).mean())}
    ov = np.array([r[5] == "overridden" for r in rows])
    if ov.sum():  # did the planners' overrides help or hurt?
        t = max(a[ov].sum(), 1e-9)
        out["overridden_rows"] = int(ov.sum())
        out["override_wape"] = float(np.abs(a[ov] - col["final"][ov]).sum() / t)
        out["override_model_wape"] = float(np.abs(a[ov] - col["p50"][ov]).sum() / t)
    return {k: round(v, 4) if isinstance(v, float) else v for k, v in out.items()}
