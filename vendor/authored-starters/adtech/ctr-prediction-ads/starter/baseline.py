"""Hashed logistic regression baseline vs a gradient-boosted challenger, evaluated the way ad systems are:
log-loss, normalised cross-entropy (NE), calibration, and bias by display position.
Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss, roc_auc_score

from features import DENSE, build_features, hashed_matrix
from make_data import generate

TRAIN_END, VALID_END = 0.70, 0.85   # fractions of the time axis: train | validation | test


def ne(y: np.ndarray, p: np.ndarray) -> float:
    """Normalised cross-entropy: log-loss divided by the log-loss of always predicting the base rate."""
    base = y.mean()
    return float(log_loss(y, np.clip(p, 1e-6, 1 - 1e-6)) / log_loss(y, np.full_like(p, base)))


def ece(y: np.ndarray, p: np.ndarray, bins: int = 10) -> float:
    q = pd.qcut(p, bins, duplicates="drop")
    g = pd.DataFrame({"y": y, "p": p, "q": q}).groupby("q", observed=True).agg(y=("y", "mean"), p=("p", "mean"), n=("y", "size"))
    return float((g.n * (g.y - g.p).abs()).sum() / g.n.sum())


def split(df: pd.DataFrame):
    t = df.ts.to_numpy()
    a, b = t.max() * TRAIN_END, t.max() * VALID_END
    return df[t <= a], df[(t > a) & (t <= b)], df[t > b]


def fit_hashed(train: pd.DataFrame, use_position: bool):
    return LogisticRegression(C=2.0, max_iter=400, solver="liblinear").fit(hashed_matrix(train, use_position), train.click_clean)


def score_pos1(frame: pd.DataFrame) -> pd.DataFrame:
    """Inference-time trick: a position-aware model is asked 'what if this ad were shown at position 1?'"""
    return frame.assign(position=1)


def run(seed: int = 5, **gen) -> dict:
    df = build_features(generate(seed=seed, **gen))
    train, valid, test = split(df)
    explore = test[test.explore == 1]
    out: dict = {"impressions": len(df), "ctr": float(df.click.mean()), "explore_rows": int(len(explore)),
                 "accidental_clicks_in_train": int(((train.click == 1) & (train.dwell_ms < 500)).sum())}

    lr_pos = fit_hashed(train, True)
    lr_nopos = fit_hashed(train, False)
    gb = HistGradientBoostingClassifier(max_depth=5, learning_rate=0.06, max_iter=250, min_samples_leaf=200,
                                        l2_regularization=3.0, random_state=seed).fit(train[DENSE], train.click_clean)

    def probs(name, frame, serve_pos1):
        f = score_pos1(frame) if serve_pos1 else frame
        if name == "lr_hashed":
            return lr_pos.predict_proba(hashed_matrix(f, True))[:, 1]
        if name == "lr_no_position":
            return lr_nopos.predict_proba(hashed_matrix(frame, False))[:, 1]
        return gb.predict_proba(f[DENSE])[:, 1]

    # calibrate the production model per placement on the validation slice (isotonic), as in the blueprint
    iso = {pl: IsotonicRegression(out_of_bounds="clip").fit(probs("gbdt", valid[valid.placement == pl], False),
                                                           valid[valid.placement == pl].click_clean) for pl in range(3)}
    for name in ("lr_no_position", "lr_hashed", "gbdt"):
        p_logged = probs(name, test, False)                      # as logged: compare with logged clicks (calibration)
        if name == "gbdt":
            p_logged = np.array([iso[pl].predict([v])[0] for pl, v in zip(test.placement, p_logged)])
        out[name] = {"logloss": float(log_loss(test.click_clean, np.clip(p_logged, 1e-6, 1 - 1e-6))),
                     "ne": ne(test.click_clean.to_numpy(), p_logged), "ece": ece(test.click_clean.to_numpy(), p_logged),
                     "auc_logged": float(roc_auc_score(test.click_clean, p_logged)),
                     # synthetic-data luxury: predicted / true click probability at the best and worst slot
                     "bias_position_1": float(p_logged[(test.position == 1).to_numpy()].mean() / test.true_p[test.position == 1].mean()),
                     "bias_position_5": float(p_logged[(test.position == 5).to_numpy()].mean() / test.true_p[test.position == 5].mean())}
    new_ads = test[~test.ad.isin(train.ad.unique())]
    out["cold_start_rows"] = int(len(new_ads))
    if len(new_ads) > 500:
        out["gbdt"]["cold_start_ne"] = ne(new_ads.click_clean.to_numpy(), probs("gbdt", new_ads, False))
        out["lr_hashed"]["cold_start_ne"] = ne(new_ads.click_clean.to_numpy(), probs("lr_hashed", new_ads, False))
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
