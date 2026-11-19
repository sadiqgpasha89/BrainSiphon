"""Greedy assignment, optimal assignment on predicted costs, and optimal assignment with an uncertainty penalty, compared on the
cost they actually realise and on how optimistic their promise was.  Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np
from scipy.optimize import linear_sum_assignment

from make_data import generate


def greedy(cost: np.ndarray) -> np.ndarray:
    """Each task in order takes its cheapest still-free resource."""
    n = cost.shape[0]
    free, out = set(range(n)), np.empty(n, dtype=int)
    for t in range(n):
        j = min(free, key=lambda j: cost[t, j])
        out[t] = j
        free.remove(j)
    return out


def optimal(cost: np.ndarray) -> np.ndarray:
    rows, cols = linear_sum_assignment(cost)
    return cols[np.argsort(rows)]


def total(cost: np.ndarray, assign: np.ndarray) -> float:
    return float(cost[np.arange(len(assign)), assign].sum())


def run(seed: int = 97, risk_aversion: float = 1.0, **gen) -> dict:
    true, pred, sigma = generate(seed=seed, **gen)
    methods = {
        "greedy_on_predictions": lambda p, s: greedy(p),
        "optimal_on_predictions": lambda p, s: optimal(p),
        "optimal_with_uncertainty_penalty": lambda p, s: optimal(p * np.exp(risk_aversion * s)),   # pay a premium for uncertain pairings
        "oracle_true_costs": None,
    }
    out = {"instances": len(true), "size": true.shape[1]}
    realised = {}
    for name, fn in methods.items():
        r, promised = [], []
        for c, p, s in zip(true, pred, sigma):
            a = optimal(c) if fn is None else fn(p, s)
            r.append(total(c, a)); promised.append(total(p, a))
        realised[name] = np.array(r)
        out[name] = {"realised_cost": float(np.mean(r)), "promised_cost": float(np.mean(promised)),
                     "optimism_gap_pct": float(100 * (np.mean(r) - np.mean(promised)) / np.mean(promised))}
    oracle = realised["oracle_true_costs"]
    for name, r in realised.items():
        out[name]["regret_vs_oracle_pct"] = float(100 * (r.mean() - oracle.mean()) / oracle.mean())
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
