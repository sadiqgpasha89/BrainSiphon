"""Uplift engine: naive comparison, inverse-propensity weighting and a two-model (T-learner) uplift ranker, scored on a holdout.

    python baseline.py     -> prints the report (also returned by run())
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression

from make_data import generate

X = [f"x{i}" for i in range(5)]


def qini_auc(uplift: np.ndarray, treated: np.ndarray, outcome: np.ndarray) -> float:
    """Area between the Qini curve of a ranking and the random-targeting line, as a share of the population, on randomised data."""
    order = np.argsort(-uplift)
    t, y = treated[order], outcome[order]
    n_t, n_c = t.sum(), (1 - t).sum()
    gain = np.cumsum(y * t) - np.cumsum(y * (1 - t)) * (n_t / n_c)
    random_line = np.linspace(0, gain[-1], len(gain))
    return float(np.mean(gain - random_line) / len(gain))


def smd(df: pd.DataFrame, col: str) -> float:
    a, b = df.loc[df.treated == 1, col], df.loc[df.treated == 0, col]
    return float((a.mean() - b.mean()) / np.sqrt((a.var() + b.var()) / 2))


def run(seed: int = 31, **gen) -> dict:
    df = generate(seed=seed, **gen)
    obs, hold = df[~df.holdout], df[df.holdout].reset_index(drop=True)
    true_ate = float(df.true_tau.mean())

    naive = float(obs.loc[obs.treated == 1, "outcome"].mean() - obs.loc[obs.treated == 0, "outcome"].mean())

    ps = LogisticRegression(max_iter=500).fit(obs[X], obs.treated)
    e = np.clip(ps.predict_proba(obs[X])[:, 1], 0.02, 0.98)
    w, y = obs.treated.to_numpy(), obs.outcome.to_numpy()
    ipw = float(np.mean(w * y / e) - np.mean((1 - w) * y / (1 - e)))

    def model():
        return HistGradientBoostingClassifier(max_iter=120, learning_rate=0.08, max_depth=3, random_state=0)

    m1 = model().fit(obs.loc[obs.treated == 1, X], obs.loc[obs.treated == 1, "outcome"])
    m0 = model().fit(obs.loc[obs.treated == 0, X], obs.loc[obs.treated == 0, "outcome"])
    uplift = m1.predict_proba(hold[X])[:, 1] - m0.predict_proba(hold[X])[:, 1]

    hw, hy = hold.treated.to_numpy(), hold.outcome.to_numpy()
    deciles = pd.qcut(pd.Series(uplift).rank(method="first"), 10, labels=False)

    def realised(mask) -> float:
        return float(hy[mask & (hw == 1)].mean() - hy[mask & (hw == 0)].mean())

    return {
        "rows": len(df),
        "observational_rows": len(obs),
        "holdout_rows": len(hold),
        "true_ate": true_ate,
        "naive_ate": naive,
        "naive_bias": naive - true_ate,
        "ipw_ate": ipw,
        "ipw_bias": ipw - true_ate,
        "holdout_ate": realised(np.ones(len(hold), bool)),
        "holdout_balance_smd_x0": smd(hold, "x0"),
        "observational_balance_smd_x0": smd(obs, "x0"),
        "t_learner_qini_auc": qini_auc(uplift, hw, hy),
        "random_ranking_qini_auc": qini_auc(np.random.default_rng(seed).normal(size=len(hold)), hw, hy),
        "top_decile_realised_uplift": realised((deciles == 9).to_numpy()),
        "bottom_decile_realised_uplift": realised((deciles == 0).to_numpy()),
        "share_predicted_negative": float((uplift < 0).mean()),
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
