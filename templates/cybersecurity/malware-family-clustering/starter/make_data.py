"""Engine: clustering and segmentation (customer, store, device, claim, patient or student segments).

Traps planted:
  * one feature is in thousands (revenue) and the rest are around 1, so an unscaled distance is really a one-feature distance
  * segments are unequal in size and some overlap
  * one share of rows are far outliers (data errors, a test account) that drag a mean-based centre
  * the mix of segments shifts in the last period, so a segmentation fit once goes stale
Ground truth (`segment`) exists only because this is synthetic: real data has none, which is why stability and use matter.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

K_TRUE = 6
D = 8


def generate(n: int = 6_000, seed: int = 51, outlier_share: float = 0.01) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    t = np.sort(rng.uniform(0, 1, n))
    early = np.array([0.30, 0.22, 0.18, 0.12, 0.10, 0.08])
    late = np.array([0.18, 0.20, 0.16, 0.12, 0.14, 0.20])
    prior = np.where((t > 0.8)[:, None], late, early)
    seg = (rng.random(n)[:, None] > prior.cumsum(axis=1)).sum(axis=1).clip(0, K_TRUE - 1)
    centres = rng.normal(0, 2.2, (K_TRUE, D))
    centres[4] = centres[3] + 1.4  # two segments overlap
    X = centres[seg] + rng.normal(0, 1.0, (n, D))
    X[:, 0] = X[:, 0] * 900 + 4000  # revenue in currency units: dwarfs every other feature
    out = rng.random(n) < outlier_share
    X[out] = X[out] + rng.normal(0, 25, (out.sum(), D)) * np.array([900] + [1] * (D - 1))
    cols = {f"f{i}": X[:, i] for i in range(D)}
    return pd.DataFrame({"t": t, **cols, "segment": seg, "outlier": out})


if __name__ == "__main__":
    d = generate()
    print(f"{len(d)} rows, segment shares {d.segment.value_counts(normalize=True).sort_index().round(2).to_dict()}")
