"""Seasonal-average baseline vs a quantile gradient-boosted sensing model, judged by weighted MAPE at 1-14 day
horizons, forecast value added (FVA), quantile coverage and the aggregate-versus-SKU gap.
Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from features import FEATURES, HORIZONS, build_table
from make_data import generate

TRAIN_ORIGIN, VALID_ORIGIN = 480, 560      # origins before 480 train, 480-560 validate, from 560 test


def wmape(y, p) -> float:
    return float(np.abs(y - p).sum() / max(np.abs(y).sum(), 1e-9))


def split(t: pd.DataFrame):
    # a training row's TARGET day must precede the validation/test origins, or the model sees the future
    train = t[t.t + t.h < TRAIN_ORIGIN]
    valid = t[(t.t >= TRAIN_ORIGIN) & (t.t < VALID_ORIGIN)]
    test = t[t.t >= VALID_ORIGIN]
    return train, valid, test


def fit(train: pd.DataFrame, seed: int = 3):
    tr = train.dropna(subset=["y_scaled"])
    tr = tr[tr.target_constrained == 0]       # do not teach the model that capped sales were real demand
    common = dict(max_depth=5, learning_rate=0.06, max_iter=250, min_samples_leaf=60, l2_regularization=1.0, random_state=seed)
    p50 = HistGradientBoostingRegressor(loss="quantile", quantile=0.5, **common).fit(tr[FEATURES], tr.y_scaled)
    p90 = HistGradientBoostingRegressor(loss="quantile", quantile=0.9, **common).fit(tr[FEATURES], tr.y_scaled)
    return p50, p90


def evaluate(test: pd.DataFrame, p50, p90) -> dict:
    t = test[test.target_constrained == 0]    # score against real demand, not allocation-capped sales
    pred = p50.predict(t[FEATURES]) * t.scale.to_numpy()
    upper = p90.predict(t[FEATURES]) * t.scale.to_numpy()
    base = t.base_same_dow.fillna(t.mean_28).to_numpy() * 1.0
    out = {"rows": len(t)}
    for h in HORIZONS:
        m = (t.h == h).to_numpy()
        out[f"h{h}"] = {"wmape_model": wmape(t.y[m], pred[m]), "wmape_baseline": wmape(t.y[m], base[m])}
        out[f"h{h}"]["fva"] = 1 - out[f"h{h}"]["wmape_model"] / out[f"h{h}"]["wmape_baseline"]
    out["p90_coverage"] = float((t.y.to_numpy() <= upper).mean())
    # aggregate-only evaluation hides SKU-level error: compare totals per (origin, horizon) with per-SKU error
    g = t.assign(pred=pred).groupby(["t", "h"]).agg(y=("y", "sum"), pred=("pred", "sum"))
    out["wmape_sku_level"] = wmape(t.y, pred)
    out["wmape_aggregate"] = wmape(g.y, g.pred)
    return out


def late_feed_experiment(df: pd.DataFrame, p50, seed: int = 3) -> dict:
    """The newest POS day is missing at forecast time for every series: zero-fill vs leave it missing."""
    res = {}
    for name, zero in (("missing_as_zero", True), ("missing_as_nan", False)):
        t = build_table(df, first_origin=VALID_ORIGIN, late_feed=True, zero_fill=zero)
        t = t[t.target_constrained == 0]
        pred = p50.predict(t[FEATURES]) * t.scale.to_numpy()
        res[name] = wmape(t.y, pred)
    return res


def run(seed: int = 3, **gen) -> dict:
    df = generate(seed=seed, **gen)
    table = build_table(df)
    train, valid, test = split(table)
    p50, p90 = fit(train, seed)
    out = evaluate(test, p50, p90)
    out["late_feed"] = late_feed_experiment(df, p50, seed)
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
