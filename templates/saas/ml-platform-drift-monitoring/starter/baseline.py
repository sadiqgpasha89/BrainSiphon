"""Three detectors judged the way an on-call engineer judges them: how many real events are caught, how late, and how many
false alerts per series per week. Thresholds are chosen on the first 60% of time to hit an alert budget, then reported on the
last 40%.   Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np

from make_data import HOURS_PER_WEEK, generate

BUDGET_FALSE_ALERTS_PER_SERIES_WEEK = 0.5
REFRACTORY_H = 6


def naive_z(x: np.ndarray, window: int = 24 * 7) -> np.ndarray:
    """Rolling mean and std of the previous week; ignores seasonality. Uses only the past (window ends before t)."""
    n = len(x)
    out = np.zeros(n)
    cs, cs2 = np.concatenate([[0], np.cumsum(x)]), np.concatenate([[0], np.cumsum(x * x)])
    for t in range(window, n):
        s, s2 = cs[t] - cs[t - window], cs2[t] - cs2[t - window]
        mu = s / window
        sd = max(np.sqrt(max(s2 / window - mu * mu, 1e-9)), 1e-6)
        out[t] = (x[t] - mu) / sd
    return out


def seasonal_z(x: np.ndarray, weeks_back: int = 4, sigma_window: int = HOURS_PER_WEEK) -> np.ndarray:
    """Subtract what this hour of this weekday looked like in the previous weeks (their median), then scale the residual by its own
    robust spread over the previous week. Everything uses only data before t."""
    n = len(x)
    start = weeks_back * HOURS_PER_WEEK
    resid = np.zeros(n)
    for t in range(start, n):
        resid[t] = x[t] - np.median(x[t - HOURS_PER_WEEK * np.arange(1, weeks_back + 1)])
    out = np.zeros(n)
    win = np.lib.stride_tricks.sliding_window_view(np.abs(resid), sigma_window)          # win[k] = |resid[k : k+W]|
    for t in range(start + sigma_window, n):
        sigma = max(np.median(win[t - sigma_window]) * 1.4826, 1e-6)                      # window ends at t-1
        out[t] = resid[t] / sigma
    return out


def scores(values: np.ndarray, calendar: np.ndarray, method: str) -> np.ndarray:
    fn = naive_z if method == "naive_z" else seasonal_z
    z = np.vstack([np.abs(fn(v)) for v in values])
    if method == "seasonal_z_calendar":
        z = np.where(calendar == 1, 0.0, z)       # the calendar says the level is supposed to move: do not alert
    return z


def alerts(z: np.ndarray, thr: float) -> list[list[int]]:
    out = []
    for row in z:
        idx, last, got = np.flatnonzero(row >= thr), -10**9, []
        for i in idx:
            if i - last >= REFRACTORY_H:
                got.append(int(i)); last = int(i)
        out.append(got)
    return out


def evaluate(z, labels, events, lo, hi, thr) -> dict:
    al = alerts(z[:, lo:hi], thr)
    n_series = z.shape[0]
    false_alerts = 0
    for s, a in enumerate(al):
        false_alerts += sum(1 for i in a if labels[s, lo + i] == 0 and labels[s, max(lo + i - 3, 0): lo + i + 1].sum() == 0)
    weeks = (hi - lo) / HOURS_PER_WEEK
    inside = [(s, a, b) for s, a, b, _ in events if a >= lo and b <= hi]
    detected, delays = 0, []
    for s, a, b in inside:
        hits = [lo + i for i in al[s] if a <= lo + i < b + 3]
        if hits:
            detected += 1
            delays.append(hits[0] - a)
    return {"false_alerts_per_series_week": false_alerts / n_series / weeks, "recall": detected / max(len(inside), 1),
            "median_delay_h": float(np.median(delays)) if delays else float("nan"), "events": len(inside)}


def pick_threshold(z, labels, events, lo, hi) -> float:
    for thr in np.linspace(1.5, 30, 58):
        if evaluate(z, labels, events, lo, hi, thr)["false_alerts_per_series_week"] <= BUDGET_FALSE_ALERTS_PER_SERIES_WEEK:
            return float(thr)
    return 30.0


def run(seed: int = 41, **gen) -> dict:
    values, labels, calendar, events = generate(seed=seed, **gen)
    T = values.shape[1]
    split = int(T * 0.6)
    out = {"series": values.shape[0], "hours": T, "events": len(events)}
    for method in ("naive_z", "seasonal_z", "seasonal_z_calendar"):
        z = scores(values, calendar, method)
        thr = pick_threshold(z, labels, events, 4 * HOURS_PER_WEEK, split)     # tune on validation only
        out[method] = {"threshold": thr, **evaluate(z, labels, events, split, T, thr)}
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
