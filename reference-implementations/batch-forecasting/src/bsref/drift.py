"""Distribution drift with the population stability index (PSI).

PSI compares the share of a reference sample and a current sample falling into each of the reference's quantile bins.
Common reading: < 0.1 stable, 0.1 to 0.25 worth a look, > 0.25 investigate before trusting the model. These are starting
thresholds, not laws: set them per feature from how much it normally moves.
"""

from __future__ import annotations

from typing import Any

import numpy as np


def reference_bins(values: np.ndarray, bins: int = 10) -> dict[str, Any]:
    """Quantile bin edges and reference shares, computed once at training time and stored with the model."""
    v = np.asarray(values, dtype=float)
    v = v[np.isfinite(v)]
    edges = np.unique(np.quantile(v, np.linspace(0, 1, bins + 1)[1:-1])) if len(v) else np.array([])
    share = np.bincount(np.searchsorted(edges, v, side="right"), minlength=len(edges) + 1) / max(1, len(v))
    return {"edges": edges.tolist(), "share": share.tolist()}


def psi(reference: dict[str, Any], current: np.ndarray, floor: float = 1e-4) -> float:
    v = np.asarray(current, dtype=float)
    v = v[np.isfinite(v)]
    if not len(v):
        return 0.0
    edges = np.asarray(reference["edges"], dtype=float)
    cur = np.bincount(np.searchsorted(edges, v, side="right"), minlength=len(edges) + 1) / len(v)
    ref = np.asarray(reference["share"], dtype=float)
    cur, ref = np.clip(cur, floor, None), np.clip(ref, floor, None)
    return float(np.sum((cur - ref) * np.log(cur / ref)))


def report(reference: dict[str, dict[str, Any]], current: dict[str, np.ndarray]) -> dict[str, float]:
    """PSI per feature for every feature present in both the reference and the current sample."""
    return {name: round(psi(ref, current[name]), 4) for name, ref in reference.items() if name in current}
