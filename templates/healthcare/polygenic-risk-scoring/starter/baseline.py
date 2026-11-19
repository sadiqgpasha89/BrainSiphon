"""Regression engine: ridge baseline against a gradient-boosted challenger, evaluated the way production will use it.

    python baseline.py     -> prints the report (also returned by run())

Reports MAE, RMSE and weighted absolute percentage error, the worst segment against the overall error, an 80% prediction
interval and its coverage, the optimism of a random split against a chronological one, and what a leaky column does.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge

from make_data import generate

FEATURES = ["x1", "x2", "x3", "x4"]


def design(df: pd.DataFrame, extra: list[str] | None = None) -> np.ndarray:
    cols = FEATURES + (extra or [])
    onehot = np.eye(4)[df["segment"].to_numpy()]
    return np.hstack([df[cols].to_numpy(), onehot])


def split(df: pd.DataFrame):
    """Chronological: oldest 70% trains, newest 30% tests."""
    cut = int(len(df) * 0.7)
    return df.iloc[:cut], df.iloc[cut:]


def errors(y: np.ndarray, p: np.ndarray) -> dict:
    e = y - p
    return {
        "mae": float(np.mean(np.abs(e))),
        "rmse": float(np.sqrt(np.mean(e**2))),
        "wape": float(np.sum(np.abs(e)) / np.sum(np.abs(y))),
        "r2": float(1 - np.sum(e**2) / np.sum((y - y.mean()) ** 2)),
    }


def gbm(loss: str = "absolute_error", **kw) -> HistGradientBoostingRegressor:
    return HistGradientBoostingRegressor(loss=loss, max_iter=200, learning_rate=0.08, max_depth=5, random_state=0, **kw)


def run(seed: int = 11, **gen) -> dict:
    df = generate(seed=seed, **gen)
    tr, te = split(df)
    ytr, yte = tr["y"].to_numpy(), te["y"].to_numpy()

    ridge = Ridge(alpha=1.0).fit(design(tr), ytr)
    p_ridge = ridge.predict(design(te))
    boosted = gbm().fit(design(tr), ytr)
    p_gbm = boosted.predict(design(te))
    lo = gbm("quantile", quantile=0.1).fit(design(tr), ytr).predict(design(te))
    hi = gbm("quantile", quantile=0.9).fit(design(tr), ytr).predict(design(te))

    seg_mae = {int(s): float(np.mean(np.abs(yte[te["segment"] == s] - p_gbm[te["segment"] == s]))) for s in range(4)}
    overall = errors(yte, p_gbm)

    # what a leaky column does: a model that sees the settled amount looks far better than any honest one
    leaky = gbm().fit(design(tr, ["settled_amount"]), ytr)
    leak_rmse = errors(yte, leaky.predict(design(te, ["settled_amount"])))["rmse"]

    # a random split mixes the drifted period into training, so it flatters the model
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(df))
    cut = int(len(df) * 0.7)
    rtr, rte = df.iloc[idx[:cut]], df.iloc[idx[cut:]]
    rand_mae = errors(rte["y"].to_numpy(), gbm().fit(design(rtr), rtr["y"].to_numpy()).predict(design(rte)))["mae"]

    return {
        "rows": len(df),
        "train_rows": len(tr),
        "test_rows": len(te),
        "baseline_ridge": errors(yte, p_ridge),
        "challenger_gbm": overall,
        "mae_gain_vs_baseline": float(1 - overall["mae"] / errors(yte, p_ridge)["mae"]),
        "interval_80_coverage": float(np.mean((yte >= lo) & (yte <= hi))),
        "interval_80_mean_width": float(np.mean(hi - lo)),
        "segment_mae": seg_mae,
        "worst_segment_vs_overall": float(max(seg_mae.values()) / overall["mae"]),
        "leaky_feature_rmse": float(leak_rmse),
        "honest_rmse": overall["rmse"],
        "random_split_mae": rand_mae,
        "chronological_mae": overall["mae"],
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
