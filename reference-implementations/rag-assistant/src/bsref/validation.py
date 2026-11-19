"""Contract-driven data validation.

A contract (data/contracts/*.yaml) declares each field's type, nullability, range, allowed values and pattern, plus dataset
rules (uniqueness, minimum row count, maximum null rate, freshness). `validate_record` guards the streaming path one event at
a time; `validate_frame` guards batch loads and training sets. A record that fails is quarantined with its violations, never
silently dropped and never passed on.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

import pandas as pd
from sqlalchemy import insert
from sqlalchemy.engine import Connection

from . import db

_TYPES = {
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v),
    "boolean": lambda v: isinstance(v, bool),
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
}


def validate_record(contract: dict[str, Any], rec: dict[str, Any]) -> list[str]:
    """Return the list of violations for one record (empty when the record conforms)."""
    out: list[str] = []
    for f in contract["fields"]:
        name, v = f["name"], rec.get(f["name"])
        if v is None:
            if f.get("required", True):
                out.append(f"{name}: missing")
            continue
        if not _TYPES[f["type"]](v):
            out.append(f"{name}: expected {f['type']}, got {type(v).__name__}")
            continue
        if "min" in f and v < f["min"]:
            out.append(f"{name}: {v} < min {f['min']}")
        if "max" in f and v > f["max"]:
            out.append(f"{name}: {v} > max {f['max']}")
        if "enum" in f and v not in f["enum"]:
            out.append(f"{name}: {v!r} not in {f['enum']}")
        if "pattern" in f and not re.fullmatch(f["pattern"], v):
            out.append(f"{name}: does not match {f['pattern']}")
        if "max_length" in f and len(v) > f["max_length"]:
            out.append(f"{name}: longer than {f['max_length']}")
    if contract.get("additional_fields", "allow") == "forbid":
        extra = set(rec) - {f["name"] for f in contract["fields"]}
        out.extend(f"{k}: unexpected field" for k in sorted(extra))
    return out


def quarantine(conn: Connection, dataset: str, key: str, violations: list[str], payload: dict[str, Any]) -> None:
    conn.execute(
        insert(db.quarantine).values(
            dataset=dataset, record_key=str(key), violations=db.dumps(violations), payload=db.dumps(payload), created_at=db.now()
        )
    )


@dataclass
class FrameReport:
    dataset: str
    rows: int
    bad_rows: int
    checks: list[dict[str, Any]] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(c["passed"] for c in self.checks)

    def failures(self) -> list[str]:
        return [f"{c['check']}: {c['detail']}" for c in self.checks if not c["passed"]]

    def raise_if_failed(self) -> None:
        if not self.passed:
            raise DataValidationError(f"{self.dataset}: " + "; ".join(self.failures()))


class DataValidationError(Exception):
    """A dataset-level check failed: the pipeline stops rather than train or score on bad data."""


def validate_frame(contract: dict[str, Any], df: pd.DataFrame, now: float | None = None) -> tuple[pd.DataFrame, FrameReport]:
    """Row-level checks split good rows from bad; dataset-level checks decide whether the load may proceed.

    Returns (good_rows, report). Dataset rules live under `dataset_rules` in the contract:
      min_rows, max_bad_row_rate, unique: [cols], max_null_rate: {col: rate}, freshness: {field, max_lag_seconds}
    """
    records = df.to_dict(orient="records")
    bad_mask = [bool(validate_record(contract, _plain(r))) for r in records]
    good = df.loc[[not b for b in bad_mask]].copy()
    rules = contract.get("dataset_rules", {})
    rep = FrameReport(dataset=contract["dataset"], rows=len(df), bad_rows=sum(bad_mask))

    def check(name: str, ok: bool, detail: str) -> None:
        rep.checks.append({"check": name, "passed": bool(ok), "detail": detail})

    if "min_rows" in rules:
        check("min_rows", len(good) >= rules["min_rows"], f"{len(good)} good rows, need {rules['min_rows']}")
    if "max_bad_row_rate" in rules:
        rate = rep.bad_rows / max(1, rep.rows)
        check("max_bad_row_rate", rate <= rules["max_bad_row_rate"], f"{rate:.4f} bad, limit {rules['max_bad_row_rate']}")
    for cols in rules.get("unique", []):
        dup = int(good.duplicated(subset=cols).sum())
        check(f"unique{cols}", dup == 0, f"{dup} duplicate rows")
    for col, limit in rules.get("max_null_rate", {}).items():
        rate = float(df[col].isna().mean()) if col in df and len(df) else 1.0
        check(f"null_rate[{col}]", rate <= limit, f"{rate:.4f}, limit {limit}")
    if "freshness" in rules and len(good):
        fr = rules["freshness"]
        lag = (now if now is not None else db.now()) - float(good[fr["field"]].max())
        check("freshness", lag <= fr["max_lag_seconds"], f"newest row is {lag:.0f}s old, limit {fr['max_lag_seconds']}s")
    return good, rep


def _plain(rec: dict[str, Any]) -> dict[str, Any]:
    """pandas hands back numpy scalars and NaN; the record validator speaks plain Python and None."""
    out: dict[str, Any] = {}
    for k, v in rec.items():
        if hasattr(v, "item"):
            v = v.item()
        if isinstance(v, float) and math.isnan(v):
            v = None
        out[k] = v
    return out
