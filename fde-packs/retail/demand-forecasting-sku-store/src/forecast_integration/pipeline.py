"""The nightly batch path: object storage in, object storage out, a manifest last. No Kafka, no real-time endpoint.

    inputs/<run_date>/sales/*.jsonl     POS sales by store-day (+ _SUCCESS)         from the POS/OMS extract job
    inputs/<run_date>/stock/*.jsonl     availability by store-day-hour (+ _SUCCESS)  from the WMS / stock ledger extract
    outputs/<run_date>/forecast/part-*  forecast rows (+ _SUCCESS manifest written last)   to replenishment
The run refuses to start on a partition without its manifest, and publishes atomically: consumers never see half a run."""
from __future__ import annotations

import datetime as dt
from typing import Any, Callable, Dict, List

from fde_adapters.connectors.s3 import S3Adapter

from .censoring import correct_day
from .contract import run_manifest, validate_row


class InputNotReady(Exception):
    pass


def _read(adapter: S3Adapter, prefix: str) -> List[Dict[str, Any]]:
    keys = [o["key"] for o in adapter.list(prefix)]
    if not any(k.endswith("_SUCCESS") for k in keys):
        raise InputNotReady(f"{prefix} has no _SUCCESS manifest: the upstream extract has not finished")
    rows: List[Dict[str, Any]] = []
    for k in keys:
        if k.endswith("_SUCCESS"):
            continue
        rows += [{**r} for r in adapter._parse(adapter._call("GET", k).body, "jsonl")]
    return rows


def run_nightly(adapter: S3Adapter, run_date: str, forecast_fn: Callable[[List[Dict[str, Any]], str], List[Dict[str, Any]]], *, model_version: str, run_id: str = "") -> Dict[str, Any]:
    sales = _read(adapter, f"inputs/{run_date}/sales/")
    stock = {(r["sku"], r["store"], r["date"]): r for r in _read(adapter, f"inputs/{run_date}/stock/")}
    history: Dict[tuple, List[float]] = {}
    corrected: List[Dict[str, Any]] = []
    for s in sales:
        st = stock.get((s["sku"], s["store"], s["date"]), {})
        wd = dt.date.fromisoformat(s["date"]).weekday()
        c = correct_day(float(s["units"]), st.get("open_hours", list(range(8, 21))), st.get("in_stock_hours", st.get("open_hours", list(range(8, 21)))), history.get((s["sku"], s["store"], wd), []))
        history.setdefault((s["sku"], s["store"], wd), []).append(c["demand"] if not c["censored"] else float(s["units"]))
        corrected.append({**s, **c})
    rows = forecast_fn(corrected, run_date)
    bad = [(r.get("sku"), validate_row(r)) for r in rows if validate_row(r)]
    if bad:
        raise ValueError(f"{len(bad)} forecast row(s) violate the output contract, nothing was published: {bad[:3]}")
    rid = run_id or f"run-{run_date}"
    adapter.publish_partition(f"outputs/{run_date}/forecast", rows, "jsonl", part_size=500)
    return {**run_manifest(rows, rid, model_version), "censored_days": sum(1 for c in corrected if c["censored"]), "input_rows": len(sales)}
