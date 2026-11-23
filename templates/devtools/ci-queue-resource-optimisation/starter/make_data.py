"""Reference kit: allocation, routing and scheduling decisions made from PREDICTED costs (assignment of tasks to vehicles, jobs to
machines, shifts to staff, orders to warehouses).

Each instance is a square assignment problem: n tasks, n resources, a true cost for each pairing, and a noisy predicted cost with a
per-pairing uncertainty. The trap is the winner's curse: an optimiser that picks the cheapest PREDICTED pairings systematically picks
the ones whose prediction errors happen to be optimistic, so the realised cost is higher than promised.
Returns (true_cost, predicted_cost, sigma) with shape (n_instances, n, n).
"""

from __future__ import annotations

import numpy as np


def generate(n_instances: int = 150, n: int = 30, seed: int = 97, noise: float = 0.35):
    rng = np.random.default_rng(seed)
    base = rng.lognormal(2.0, 0.5, (n_instances, n, n))
    sigma = noise * rng.uniform(0.3, 1.5, (n_instances, n, n))                 # some pairings are far less predictable than others
    err = rng.normal(0, 1, (n_instances, n, n)) * sigma
    predicted = base * np.exp(err)
    return base, predicted, sigma


if __name__ == "__main__":
    c, p, s = generate()
    print(f"{c.shape[0]} instances of {c.shape[1]}x{c.shape[1]} assignment; median prediction error {np.median(np.abs(np.log(p / c))):.2f} (log scale)")
