"""Engine: time-to-event modelling with censoring (churn timing, default, time to failure, readmission, time to resolution).

Traps planted:
  * administrative censoring: the study ends, so recent entrants are only observed for a short time
  * random drop-out before the event (also censoring, and not an event)
  * a Weibull hazard that rises with account age, driven by four covariates
Times are in months. Subjects enter over `entry_span` months; the study closes at `study_end`.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def generate(n: int = 9_000, seed: int = 41, horizon: int = 36, dropout: float = 0.2, study_end: float = 36.0, entry_span: float = 30.0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    x = rng.normal(size=(n, 4))
    shape = 1.3
    rate = np.exp(-3.6 + 0.7 * x[:, 0] - 0.5 * x[:, 1] + 0.3 * x[:, 2])
    event_time = (-np.log(rng.random(n)) / rate) ** (1 / shape)
    entry = rng.uniform(0, entry_span, n)
    admin = study_end - entry
    drop = np.where(rng.random(n) < dropout, rng.exponential(30.0, n), np.inf)
    cens = np.minimum(np.minimum(admin, drop), float(horizon))
    time = np.minimum(event_time, cens)
    event = (event_time <= cens).astype(int)
    cols = {f"x{i}": x[:, i] for i in range(4)}
    return pd.DataFrame({"entry": entry, **cols, "time": time, "event": event})


if __name__ == "__main__":
    d = generate()
    print(f"{len(d)} subjects, events {d.event.mean():.1%}, median follow-up {d.time.median():.1f} months")
