"""Engine: sequential control under uncertainty (budget pacing, throttling, inventory and queue control, dynamic limits).

A day is 288 five-minute steps. A controller sets a rate multiplier each step; the plant turns it into spend (or volume) using an
exogenous opportunity curve it does not control. What makes this a control problem and not a prediction problem:
  * the opportunity curve has two daily peaks and, on some days, an outage (a collapse) and a surge
  * the controller sees the cumulative total only after `delay` steps
  * there is a hard cap: overspending is worse than underspending
"""

from __future__ import annotations

import numpy as np

STEPS = 288


def profile() -> np.ndarray:
    """Expected share of the day's opportunity per step: a morning and an evening peak."""
    x = np.arange(STEPS) / STEPS
    p = 0.5 + np.exp(-((x - 0.38) ** 2) / 0.008) + 1.3 * np.exp(-((x - 0.78) ** 2) / 0.01)
    return p / p.sum()


def day(seed: int, outage: bool = True, surge: bool = True) -> np.ndarray:
    """Realised opportunity per step for one day, as a share of the expected total (so it can exceed or fall short of 1)."""
    rng = np.random.default_rng(seed)
    scale = rng.lognormal(0, 0.12)
    o = profile() * scale * rng.lognormal(0, 0.18, STEPS)
    if outage and rng.random() < 0.5:
        a = int(rng.integers(60, 180))
        o[a : a + 36] *= 0.15
    if surge and rng.random() < 0.5:
        a = int(rng.integers(150, 240))
        o[a : a + 30] *= 2.2
    return o


if __name__ == "__main__":
    o = day(1)
    print(f"{STEPS} steps, opportunity total {o.sum():.2f} of the expected 1.00")
