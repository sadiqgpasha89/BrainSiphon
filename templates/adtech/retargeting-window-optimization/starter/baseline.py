"""Survival engine: Kaplan-Meier and a naive classifier against a discrete-time hazard model.

    python baseline.py     -> prints the report (also returned by run())
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

from make_data import generate

X = [f"x{i}" for i in range(4)]


def kaplan_meier(time: np.ndarray, event: np.ndarray, at: float) -> float:
    """Survival probability at `at` months, treating censored subjects as at risk until they leave."""
    surv = 1.0
    for t in np.unique(time[(event == 1) & (time <= at)]):
        at_risk = (time >= t).sum()
        deaths = ((time == t) & (event == 1)).sum()
        surv *= 1 - deaths / at_risk
    return float(surv)


def concordance(risk: np.ndarray, time: np.ndarray, event: np.ndarray, max_n: int = 2500) -> float:
    """Harrell's C: among comparable pairs (the earlier time is an event), the share where the earlier subject has the higher risk."""
    if len(risk) > max_n:
        idx = np.random.default_rng(0).choice(len(risk), max_n, replace=False)
        risk, time, event = risk[idx], time[idx], event[idx]
    ti, tj = time[:, None], time[None, :]
    comparable = (ti < tj) & (event[:, None] == 1)
    higher = risk[:, None] > risk[None, :]
    ties = risk[:, None] == risk[None, :]
    return float(((higher & comparable).sum() + 0.5 * (ties & comparable).sum()) / comparable.sum())


def person_period(df: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """One row per subject-month at risk; `y` is 1 only in the month the event happens."""
    months = np.minimum(np.ceil(df["time"].to_numpy()).astype(int), horizon)
    idx = np.repeat(np.arange(len(df)), months)
    month = np.concatenate([np.arange(1, m + 1) for m in months])
    out = df[X].to_numpy()[idx]
    last = month == months[idx]
    y = (last & (df["event"].to_numpy()[idx] == 1)).astype(int)
    return pd.DataFrame({**{c: out[:, i] for i, c in enumerate(X)}, "month": month, "log_month": np.log(month), "y": y})


def survival_curve(model: LogisticRegression, x: np.ndarray, horizon: int) -> np.ndarray:
    """S(1..horizon | x) from monthly hazards."""
    grid = np.arange(1, horizon + 1)
    rows = np.hstack([np.repeat(x, horizon, axis=0), np.tile(grid, len(x))[:, None], np.log(np.tile(grid, len(x)))[:, None]])
    h = model.predict_proba(rows)[:, 1].reshape(len(x), horizon)
    return np.cumprod(1 - h, axis=1)


def run(seed: int = 41, at_month: int = 12, **gen) -> dict:
    df = generate(seed=seed, **gen)
    horizon = int(df["time"].max().round()) or 36
    cut = df["entry"].quantile(0.65)
    tr, te = df[df["entry"] <= cut], df[df["entry"] > cut]  # train on earlier cohorts, test on later ones

    km = kaplan_meier(te["time"].to_numpy(), te["event"].to_numpy(), at_month)
    # the naive classifier: "did the event happen within a year?", dropping everyone not yet observed for a year
    complete = te[(te["event"] == 1) & (te["time"] <= at_month) | (te["time"] >= at_month)]
    naive_event_rate = float(((complete["event"] == 1) & (complete["time"] <= at_month)).mean())
    all_rows_event_rate = float(((te["event"] == 1) & (te["time"] <= at_month)).mean())

    pp = person_period(tr, horizon)
    hazard = LogisticRegression(max_iter=500).fit(pp[X + ["month", "log_month"]].to_numpy(), pp["y"].to_numpy())
    s = survival_curve(hazard, te[X].to_numpy(), horizon)
    risk = 1 - s[:, at_month - 1]
    c_index = concordance(risk, te["time"].to_numpy(), te["event"].to_numpy())

    deciles = pd.qcut(pd.Series(risk).rank(method="first"), 10, labels=False).to_numpy()
    gaps = []
    for d in range(10):
        m = deciles == d
        obs = 1 - kaplan_meier(te["time"].to_numpy()[m], te["event"].to_numpy()[m], at_month)
        gaps.append(abs(float(risk[m].mean()) - obs))
    return {
        "subjects": len(df),
        "train_subjects": len(tr),
        "test_subjects": len(te),
        "event_share": float(df["event"].mean()),
        "censored_share": float(1 - df["event"].mean()),
        "at_month": at_month,
        "km_event_rate": 1 - km,
        "naive_drop_censored_event_rate": naive_event_rate,
        "naive_bias_vs_km": naive_event_rate - (1 - km),
        "count_all_rows_event_rate": all_rows_event_rate,
        "count_all_rows_bias_vs_km": all_rows_event_rate - (1 - km),
        "discrete_time_mean_predicted_risk": float(risk.mean()),
        "c_index": c_index,
        "decile_calibration_mean_abs_gap": float(np.mean(gaps)),
        "decile_calibration_max_abs_gap": float(np.max(gaps)),
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
