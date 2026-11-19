"""Synthetic daily demand for many SKUs, with the signals and traps of short-term demand sensing.

Per series and day we return:
  sales        observed units (capped when the supplier restricts allocation -> censored demand)
  promo        planned promotion flag, known weeks ahead
  ext_signal   external event index (weather, strike, holiday), published as a forecast up to 14 days ahead
  prebooked_h  units already booked for day t+h when the forecast is made on day t, for h in 1..14
               (the open order book: a leading indicator that exists only for the next two weeks)
  constrained  1 when allocation limits made sales understate demand
"""

from __future__ import annotations

import numpy as np
import pandas as pd

H_MAX = 14


def generate(n_series: int = 300, days: int = 730, seed: int = 3) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    t = np.arange(days)
    ext = np.zeros(days)
    for s in rng.choice(np.arange(20, days - 5), 14, replace=False):           # a few shared demand shocks
        ext[s:s + rng.integers(2, 6)] += rng.uniform(0.25, 0.6)
    frames = []
    for sid in range(n_series):
        level = rng.lognormal(2.7, 0.8)
        week = rng.dirichlet(np.full(7, 12.0)) * 7
        annual = 1 + rng.uniform(0.05, 0.3) * np.sin(2 * np.pi * (t / 365.25 + rng.random()))
        trend = 1 + rng.uniform(-0.2, 0.35) * t / days
        promo = np.zeros(days)
        for s in rng.choice(days - 8, rng.integers(5, 10), replace=False):
            promo[s:s + rng.integers(3, 8)] = 1
        uplift = rng.uniform(0.35, 0.9)
        sens = rng.uniform(0.3, 1.2)                                           # sensitivity to the external signal
        demand = level * week[t % 7] * annual * trend * (1 + uplift * promo) * (1 + sens * ext)
        demand = rng.gamma(shape=30.0, scale=demand / 30.0)                    # noise with ~18% CV
        cap = np.full(days, np.inf)
        constrained = np.zeros(days)
        for s in rng.choice(days - 12, rng.integers(2, 5), replace=False):
            n = rng.integers(3, 10)
            cap[s:s + n] = demand[s:s + n] * rng.uniform(0.3, 0.6)
            constrained[s:s + n] = 1
        sales = np.round(np.minimum(demand, cap))
        df = pd.DataFrame({"sid": sid, "day": t, "sales": sales, "promo": promo, "ext_signal": ext,
                           "constrained": constrained, "true_demand": demand})
        for h in range(1, H_MAX + 1):
            share = np.clip(0.55 - 0.035 * h, 0.05, None)                      # booked share shrinks with distance
            fut = np.roll(demand, -h)
            booked = np.round(fut * share * rng.uniform(0.7, 1.3, days))
            booked[days - h:] = np.nan
            df[f"prebooked_{h}"] = booked                                       # known on day t for day t+h
        frames.append(df)
    return pd.concat(frames, ignore_index=True)


if __name__ == "__main__":
    d = generate()
    d.to_csv("daily_demand.csv", index=False)
    print(f"{d.sid.nunique()} series x {d.day.nunique()} days, mean {d.sales.mean():.1f} units/day, "
          f"constrained days {d.constrained.mean():.1%}")
