"""TF-IDF + logistic regression evaluated two ways: the optimistic way (random split, leak token left in) and the honest way
(split by thread and time, leak token removed), plus a calibration check and a drift check.  Run:  python baseline.py"""

from __future__ import annotations

import json
import re

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score

from make_data import generate

LEAK = re.compile(r"\bresolved_as_\d+\b")


def strip_leak(texts: pd.Series) -> pd.Series:
    return texts.str.replace(LEAK, "", regex=True)


def ece(y, p, bins: int = 10) -> float:
    """Expected calibration error of the top-class confidence: the gap between confidence and accuracy, averaged over bins."""
    conf, hit = p.max(axis=1), (p.argmax(axis=1) == y).astype(float)
    idx = np.minimum((conf * bins).astype(int), bins - 1)
    total = 0.0
    for b in range(bins):
        m = idx == b
        if m.any():
            total += m.sum() * abs(hit[m].mean() - conf[m].mean())
    return float(total / len(y))


def fit_eval(train, test, clean: bool):
    tx = (lambda s: strip_leak(s)) if clean else (lambda s: s)
    vec = TfidfVectorizer(min_df=2, sublinear_tf=True)
    Xtr, Xte = vec.fit_transform(tx(train.text)), vec.transform(tx(test.text))
    base = LogisticRegression(C=4.0, max_iter=500)
    model = base.fit(Xtr, train.label)
    p = model.predict_proba(Xte)
    return {"macro_f1": float(f1_score(test.label, p.argmax(axis=1), average="macro")), "ece": ece(test.label.to_numpy(), p)}


def run(seed: int = 61, **gen) -> dict:
    df = generate(seed=seed, **gen)
    rng = np.random.default_rng(seed)
    out = {"docs": len(df), "duplicate_share": float(1 - df.thread.nunique() / len(df))}

    # 1) the optimistic evaluation: random split, copies on both sides, leak token present
    idx = rng.permutation(len(df))
    cut = int(0.75 * len(df))
    out["random_split_with_leak"] = fit_eval(df.iloc[idx[:cut]], df.iloc[idx[cut:]], clean=False)

    # 2) the honest evaluation: earlier months train, later months test, leak removed, whole threads stay together
    early = df[df.month < 4]
    unseen = lambda part: part[~part.thread.isin(set(early.thread))]          # noqa: E731  (a copy of a training doc is not a test)
    out["time_split_clean"] = fit_eval(early, unseen(df[df.month >= 6]), clean=True)

    # 3) drift: the same frozen model on the month right after training (month 4) versus months 6-7, when new product words appear
    out["frozen_model_next_month"] = fit_eval(early, unseen(df[df.month == 4]), clean=True)
    out["frozen_model_months_6_7"] = fit_eval(early, unseen(df[df.month >= 6]), clean=True)
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
