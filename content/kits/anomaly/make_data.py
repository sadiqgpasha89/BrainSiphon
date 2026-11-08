"""Reference kit: anomaly detection on operational metrics (spend, traffic, latency, sensor readings, usage).

Synthetic hourly series with the traps every monitoring system meets:
  * daily and weekly seasonality, so a global threshold fires every morning
  * three anomaly shapes: short spikes, level shifts (hours to two days) and slow drifts
  * BENIGN calendar events (promotions, deploys, holidays) that move the level on purpose and are known in advance
  * the label is an interval, so 'detected' means an alert inside the interval and delay is measured from its start
Returns (values[n_series, T], labels[n_series, T] 0/1, calendar[n_series, T] 0/1, events) where events is a list of
(series, start, end, kind).
"""

from __future__ import annotations

import numpy as np

HOURS_PER_WEEK = 24 * 7


def generate(n_series: int = 120, weeks: int = 12, seed: int = 41, anomalies_per_series: float = 2.5):
    rng = np.random.default_rng(seed)
    T = weeks * HOURS_PER_WEEK
    t = np.arange(T)
    values = np.empty((n_series, T))
    labels = np.zeros((n_series, T), dtype=int)
    calendar = np.zeros((n_series, T), dtype=int)
    events: list[tuple[int, int, int, str]] = []
    for s in range(n_series):
        level = rng.lognormal(3.0, 0.6)
        daily, weekly = rng.uniform(0.15, 0.45), rng.uniform(0.05, 0.25)
        phase = rng.uniform(0, 24)
        sd = level * rng.uniform(0.04, 0.09)
        v = level * (1 + daily * np.sin(2 * np.pi * (t + phase) / 24) + weekly * np.sin(2 * np.pi * t / HOURS_PER_WEEK))
        v = v + rng.normal(0, sd, T)
        for _ in range(rng.poisson(4)):                        # known benign events: the level moves, nothing is wrong
            a = int(rng.integers(HOURS_PER_WEEK, T - 30))
            b = a + int(rng.integers(6, 24))
            v[a:b] += level * rng.uniform(0.25, 0.5)
            calendar[s, a:b] = 1
        for _ in range(rng.poisson(anomalies_per_series)):
            kind = str(rng.choice(["spike", "shift", "drift"], p=[0.4, 0.4, 0.2]))
            a = int(rng.integers(3 * HOURS_PER_WEEK, T - 60))
            sign = rng.choice([-1, 1])
            if kind == "spike":
                b = a + int(rng.integers(1, 4))
                v[a:b] += sd * rng.uniform(7, 12) * sign
            elif kind == "shift":
                b = a + int(rng.integers(12, 48))
                v[a:b] += sd * rng.uniform(4, 7) * sign
            else:
                b = a + int(rng.integers(24, 60))
                v[a:b] += np.linspace(0, sd * rng.uniform(5, 8), b - a) * sign
            labels[s, a:b] = 1
            events.append((s, a, b, kind))
        values[s] = v
    return values, labels, calendar, events


if __name__ == "__main__":
    v, y, c, ev = generate()
    print(f"{v.shape[0]} series x {v.shape[1]} hours, {len(ev)} anomalies "
          f"({y.mean():.2%} of points), {c.mean():.2%} of points inside benign calendar events")
