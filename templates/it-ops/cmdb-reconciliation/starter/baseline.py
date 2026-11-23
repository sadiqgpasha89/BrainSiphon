"""Multi-class engine: calibrated multinomial baseline against a boosted challenger, with group-safe chronological evaluation.

    python baseline.py     -> prints the report (also returned by run())
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.preprocessing import StandardScaler

from make_data import D, K, generate

FEATURES = [f"x{i + 1}" for i in range(D)]


def ece_top_label(proba: np.ndarray, y: np.ndarray, bins: int = 10) -> float:
    conf, pred = proba.max(axis=1), proba.argmax(axis=1)
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            total += m.mean() * abs((pred[m] == y[m]).mean() - conf[m].mean())
    return float(total)


def chronological_group_split(df: pd.DataFrame, test_share: float = 0.25):
    cut = int(len(df) * (1 - test_share))
    train, test = df.iloc[:cut], df.iloc[cut:]
    return train[~train["group"].isin(set(test["group"]))], test  # no entity on both sides


def score(Xtr, ytr, Xte, yte) -> dict:
    sc = StandardScaler().fit(Xtr)
    lr = LogisticRegression(max_iter=500).fit(sc.transform(Xtr), ytr)
    hgb = HistGradientBoostingClassifier(max_iter=150, learning_rate=0.08, max_depth=4, random_state=0).fit(Xtr, ytr)
    out = {}
    for name, proba in (("baseline_lr", lr.predict_proba(sc.transform(Xte))), ("challenger_hgb", hgb.predict_proba(Xte))):
        pred = proba.argmax(axis=1)
        out[name] = {
            "macro_f1": float(f1_score(yte, pred, average="macro")),
            "accuracy": float((pred == yte).mean()),
            "ece": ece_top_label(proba, yte),
            "recall_by_class": [float(((pred == k) & (yte == k)).sum() / max(1, (yte == k).sum())) for k in range(K)],
            "confusable_pair_error": float(((pred == 3) & (yte == 2)).sum() + ((pred == 2) & (yte == 3)).sum()) / max(1, np.isin(yte, [2, 3]).sum()),
        }
    return out


def run(seed: int = 21, **gen) -> dict:
    df = generate(seed=seed, **gen)
    tr, te = chronological_group_split(df)
    clean = score(tr[FEATURES].to_numpy(), tr["y"].to_numpy(), te[FEATURES].to_numpy(), te["y"].to_numpy())
    # a random split puts repeat entities on both sides
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(df))
    cut = int(len(df) * 0.75)
    a, b = df.iloc[idx[:cut]], df.iloc[idx[cut:]]
    leaky = score(a[FEATURES].to_numpy(), a["y"].to_numpy(), b[FEATURES].to_numpy(), b["y"].to_numpy())
    majority = float((te["y"] == tr["y"].mode()[0]).mean())
    return {
        "rows": len(df),
        "train_rows": len(tr),
        "test_rows": len(te),
        "majority_class_accuracy": majority,
        **clean,
        "random_split_challenger_macro_f1": leaky["challenger_hgb"]["macro_f1"],
        "leaky_split_inflation": leaky["challenger_hgb"]["macro_f1"] - clean["challenger_hgb"]["macro_f1"],
        "test_class_shares": [float((te["y"] == k).mean()) for k in range(K)],
        "train_class_shares": [float((tr["y"] == k).mean()) for k in range(K)],
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
