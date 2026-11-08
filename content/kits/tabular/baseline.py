"""Baseline (calibrated logistic regression) vs challenger (gradient boosting) with the evaluation
discipline from the blueprint: chronological split, matured labels only, PR-AUC and recall at a fixed
0.5% false-positive rate. Run:  python baseline.py   -> prints the report and writes report.json"""

from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_curve
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from features import DAY, FEATURES, build_features
from make_data import LABEL_MATURITY_DAYS, generate

TRAIN_END, VALID_END, TEST_START = 45 * DAY, 59 * DAY, 80 * DAY  # gap [59d, 80d) = label-maturity gap


def recall_at_fpr(y: np.ndarray, p: np.ndarray, fpr_target: float = 0.005) -> float:
    fpr, tpr, _ = roc_curve(y, p)
    return float(np.interp(fpr_target, fpr, tpr))


def split(df: pd.DataFrame):
    train = df[df.ts < TRAIN_END]
    valid = df[(df.ts >= TRAIN_END) & (df.ts < VALID_END)]
    test = df[df.ts >= TEST_START]
    # the leakage guard: nothing in training may rely on a label that had not arrived by the cut-off
    assert train.label_ts.max() < TEST_START and (train.ts + LABEL_MATURITY_DAYS * DAY <= TEST_START).all()
    return train, valid, test


def log_features(X: pd.DataFrame) -> np.ndarray:
    return np.log1p(X[FEATURES].clip(lower=0).to_numpy())


def run(seed: int = 7, **gen_kwargs) -> dict:
    df = build_features(generate(seed=seed, **gen_kwargs))
    train, valid, test = split(df)
    Xtr, Xte = log_features(train), log_features(test)

    base = make_pipeline(StandardScaler(), LogisticRegression(C=0.5, max_iter=2000))
    base = CalibratedClassifierCV(base, method="isotonic", cv=3).fit(Xtr, train.label)
    chal = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=120, min_samples_leaf=100,
                                          l2_regularization=5.0, random_state=seed)  # strong regularisation: ~200 positives
    chal.fit(train[FEATURES], train.label)

    report = {"rows": len(df), "positive_rate": float(df.label.mean()), "test_rows": len(test),
              "test_positive_rate": float(test.label.mean())}
    for name, p in (("baseline_lr", base.predict_proba(Xte)[:, 1]), ("challenger_hgb", chal.predict_proba(test[FEATURES])[:, 1])):
        report[name] = {"pr_auc": float(average_precision_score(test.label, p)),
                        "recall_at_0.5pct_fpr": recall_at_fpr(test.label.to_numpy(), p),
                        "brier": float(brier_score_loss(test.label, p))}
    return report


if __name__ == "__main__":
    rep = run()
    print(json.dumps(rep, indent=2))
    with open("report.json", "w") as fh:
        json.dump(rep, fh, indent=2)
    sys.exit(0)
