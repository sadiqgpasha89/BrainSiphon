"""Engine: continuous-target estimation (price, ETA, duration, load, valuation, lifetime value).

A synthetic table with the traps this problem type always has:
  * a chronological drift: the relationship between a main feature and the target changes in the last quarter
  * heavy-tailed, heteroscedastic noise, largest in the smallest segment, so one global error number hides it
  * a small share of data-entry outliers in the target
  * a "leaky" column recorded after the outcome (a settled amount, a final duration) that must never be a feature
Time `t` runs 0..1; rows are ordered by time.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

SEGMENTS = np.array([0.0, 6.0, -4.0, 15.0])


def generate(n: int = 24_000, seed: int = 11, outlier_share: float = 0.02, drift: float = 0.25) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    t = np.sort(rng.uniform(0, 1, n))
    x1, x2, x4 = rng.normal(size=n), rng.normal(size=n), rng.normal(size=n)
    x3 = rng.uniform(-2, 2, n)
    seg = rng.choice(4, size=n, p=[0.5, 0.3, 0.15, 0.05])
    mean = 50 + 8 * x1 + 5 * np.sin(2 * x3) + 6 * x1 * x2 + 4 * (x4 > 1) + SEGMENTS[seg]
    mean = mean + drift * 10 * x1 * (t > 0.75)
    sigma = 2.0 + 1.5 * (seg == 3) + 1.0 * np.abs(x2)
    y = mean + rng.standard_t(df=5, size=n) * sigma
    outlier = rng.random(n) < outlier_share
    y = np.where(outlier, y + rng.choice([-1.0, 1.0], n) * rng.uniform(40, 80, n), y)
    leak = 0.9 * y + rng.normal(0, 1, n)  # recorded after the outcome: not available at prediction time
    return pd.DataFrame({"t": t, "x1": x1, "x2": x2, "x3": x3, "x4": x4, "segment": seg, "settled_amount": leak, "y": y})


if __name__ == "__main__":
    d = generate()
    print(f"{len(d)} rows, target mean {d.y.mean():.1f}, sd {d.y.std():.1f}")
