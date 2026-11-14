"""Shadow traffic replay: send recorded switch traffic to the gateway, measure latency at the switch (client) side, and compare the
model's decisions with what the legacy engine did. Run it before any live traffic, and again after every model or policy change."""
from __future__ import annotations

import json
import statistics
from typing import Any, Dict, Iterable, List

from .gateway import SwitchClient
from .iso8583 import IsoMessage


def percentile(xs: List[float], p: float) -> float:
    if not xs:
        return 0.0
    xs = sorted(xs)
    k = (len(xs) - 1) * p / 100
    lo, hi = int(k), min(int(k) + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)


def load_jsonl(path: str) -> List[Dict[str, Any]]:
    with open(path, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def replay(rows: Iterable[Dict[str, Any]], client: SwitchClient, *, budget_ms: float) -> Dict[str, Any]:
    """rows: {"mti", "fields": {"2": "...", ...}, "legacy": "00"|"05"|...}. Returns latency percentiles and agreement with the legacy decision."""
    import time
    lat: List[float] = []
    agree = disagree = timeouts = 0
    diffs: List[Dict[str, Any]] = []
    codes: Dict[str, int] = {}
    for r in rows:
        m = IsoMessage(r["mti"], {int(k): v for k, v in r["fields"].items()})
        t0 = time.perf_counter()
        try:
            resp = client.send(m)
        except OSError:
            timeouts += 1
            continue
        ms = (time.perf_counter() - t0) * 1000
        lat.append(ms)
        code = resp.get(39)
        codes[code] = codes.get(code, 0) + 1
        legacy = r.get("legacy")
        if legacy is not None:
            if (code == "00") == (legacy == "00"):
                agree += 1
            else:
                disagree += 1
                diffs.append({"rrn": m.get(37), "model": code, "legacy": legacy})
    return {
        "count": len(lat), "timeouts": timeouts, "over_budget": sum(1 for x in lat if x > budget_ms),
        "latency_ms": {"p50": round(percentile(lat, 50), 3), "p95": round(percentile(lat, 95), 3), "p99": round(percentile(lat, 99), 3), "mean": round(statistics.fmean(lat), 3) if lat else 0.0},
        "response_codes": codes, "legacy_agreement": {"agree": agree, "disagree": disagree, "rate": round(agree / (agree + disagree), 4) if agree + disagree else None},
        "disagreements": diffs[:50], "budget_ms": budget_ms,
    }
