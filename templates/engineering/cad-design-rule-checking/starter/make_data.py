"""Engine: multi-class classification on structured features (triage level, category, intent, grade, risk band).

Traps planted:
  * the class prior drifts over time, so a random split overstates what next quarter will look like
  * two classes are genuinely confusable and carry label noise between them (the pair an operator cares about most)
  * the same entity appears many times (`group`): a random split leaks it into both train and test
"""

from __future__ import annotations

import numpy as np
import pandas as pd

K = 5
D = 6


def generate(n: int = 14_000, seed: int = 21, label_noise: float = 0.06, dup_share: float = 0.35) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    t = np.sort(rng.uniform(0, 1, n))
    early = np.array([0.34, 0.26, 0.2, 0.15, 0.05])
    late = np.array([0.22, 0.2, 0.2, 0.18, 0.2])  # the rare class becomes common
    prior = np.where((t > 0.7)[:, None], late, early)
    y = (rng.random(n)[:, None] > prior.cumsum(axis=1)).sum(axis=1).clip(0, K - 1)
    means = rng.normal(0, 1.6, (K, D))
    means[3] = means[2] + 0.8  # classes 2 and 3 overlap
    X = means[y] + rng.normal(0, 1.0, (n, D))
    swap = (rng.random(n) < label_noise * 3) & np.isin(y, [2, 3])
    y = np.where(swap, np.where(y == 2, 3, 2), y)
    # entity groups: most rows are the only one of their entity, a share belong to repeat entities
    group = np.arange(n)
    rep = rng.random(n) < dup_share
    anchors = rng.integers(0, max(2, n // 12), n)
    group = np.where(rep, anchors, group + n)
    for g in np.unique(group[rep]):  # repeat entities share their features (same customer, same device)
        rows = np.flatnonzero(group == g)
        X[rows] = X[rows[0]] + rng.normal(0, 0.15, (len(rows), D))
        y[rows] = y[rows[0]]
    cols = {f"x{i + 1}": X[:, i] for i in range(D)}
    return pd.DataFrame({"t": t, **cols, "group": group, "y": y})


if __name__ == "__main__":
    d = generate()
    print(f"{len(d)} rows, class shares {d.y.value_counts(normalize=True).sort_index().round(3).to_dict()}")
