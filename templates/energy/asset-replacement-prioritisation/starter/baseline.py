"""Control engine: an open-loop schedule against a PID pacer with anti-windup, under delay, outages and surges.

    python baseline.py     -> prints the report (also returned by run())

Spend per step is `multiplier * opportunity`; the target is the cumulative profile of a budget of 1.0. A step's multiplier is chosen
from the cumulative error seen `delay` steps ago.
"""

from __future__ import annotations

import json

import numpy as np

from make_data import STEPS, day, profile


def simulate(controller: str, opp: np.ndarray, delay: int = 3, kp: float = 4.0, ki: float = 0.4, kd: float = 0.0, cap: float = 1.0) -> dict:
    target = np.cumsum(profile())
    spent = np.zeros(STEPS)
    mult = np.ones(STEPS)
    integral, prev_err, total = 0.0, 0.0, 0.0
    for t in range(STEPS):
        if controller == "pid":
            seen = spent[t - delay] if t >= delay else 0.0
            err = target[max(t - delay, 0)] - seen  # positive: behind the plan
            integral = float(np.clip(integral + err, -0.5 / max(ki, 1e-9), 0.5 / max(ki, 1e-9)))  # anti-windup clamp
            m = 1.0 + kp * err + ki * integral + kd * (err - prev_err)
            prev_err = err
            mult[t] = float(np.clip(m, 0.0, 3.0))
        step = mult[t] * opp[t]
        if total + step > cap:  # hard cap: the platform stops spending at the budget
            step = max(cap - total, 0.0)
        total += step
        spent[t] = total
    gap = spent - target
    return {
        "tracking_rmse_pct": float(np.sqrt(np.mean(gap**2)) * 100),
        "end_of_day_underdelivery_pct": float(max(1.0 - spent[-1], 0.0) * 100),
        "overshoot_max_pct": float(max(gap.max(), 0.0) * 100),
        "oscillation": float(np.std(np.diff(mult)) / max(np.mean(mult), 1e-9)),
        "hit_cap": bool(spent[-1] >= cap - 1e-9),
    }


def aggregate(controller: str, seed: int, days: int, **kw) -> dict:
    runs = [simulate(controller, day(seed * 1000 + d), **kw) for d in range(days)]
    return {k: float(np.mean([r[k] for r in runs])) for k in runs[0]}


def run(seed: int = 71, days: int = 60) -> dict:
    open_loop = aggregate("open", seed, days)
    pid = aggregate("pid", seed, days)
    aggressive = aggregate("pid", seed, days, kp=60.0, ki=6.0)
    slow_feed = aggregate("pid", seed, days, delay=24)
    return {
        "days": days,
        "steps_per_day": STEPS,
        "open_loop": open_loop,
        "pid": pid,
        "pid_aggressive_gains": aggressive,
        "pid_with_two_hour_feedback_delay": slow_feed,
        "rmse_reduction_vs_open_loop": float(1 - pid["tracking_rmse_pct"] / open_loop["tracking_rmse_pct"]),
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
