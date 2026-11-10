"""Baseline (calibrated logistic regression) vs challenger (gradient boosting) with the evaluation
discipline from the blueprint: chronological split, matured labels only, PR-AUC and recall at a fixed
0.5% false-positive rate (a ranking measure), and the business acceptance gate: the false-decline rate on genuine
volume across the three actions allow, step-up and block at thresholds chosen on validation data.

Run:  python baseline.py [card|upi]   -> prints the report and writes report.json"""

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
from make_data import MODES, generate, maturity_days

# Each rail has its own evaluation protocol: the gap between validation and test is that rail's label-maturity window.
SPLITS = {"card": (45, 59, 80), "upi": (45, 59, 66)}  # train end, validation end, test start (days)
TRAIN_END, VALID_END, TEST_START = (d * DAY for d in SPLITS["card"])  # kept for callers written for the single-rail starter

# Decision vocabulary: the API contract maps these to ALLOW | STEP_UP | BLOCK (see decisionContract in the blueprint).
DECISIONS = ("allow", "step_up", "block")

# Acceptance policy. The business constraint is "false declines under 0.3% of genuine volume, across all three actions".
#  * a blocked genuine payment is a decline
#  * a stepped-up genuine payment is a decline only when the customer fails or abandons the challenge: ASSUMED 5% here; measure it
#  * validation thresholds are built to reach only half the ceiling, because the same thresholds drift on later data
POLICY = {"max_false_decline": 0.003, "valid_headroom": 0.5, "step_up_budget": 0.02, "step_up_failure_rate": 0.05}


def recall_at_fpr(y: np.ndarray, p: np.ndarray, fpr_target: float = 0.005) -> float:
    fpr, tpr, _ = roc_curve(y, p)
    return float(np.interp(fpr_target, fpr, tpr))


def split(df: pd.DataFrame, mode: str = "card"):
    train_end, valid_end, test_start = (d * DAY for d in SPLITS[mode])
    train = df[df.ts < train_end]
    valid = df[(df.ts >= train_end) & (df.ts < valid_end)]
    test = df[df.ts >= test_start]
    # the leakage guard: nothing in training or validation may rely on a label that had not arrived by the cut-off
    assert train.label_ts.max() < test_start and (train.ts + maturity_days(mode) * DAY <= test_start).all()
    assert valid.label_ts.max() < test_start and (valid.ts + maturity_days(mode) * DAY <= test_start).all()
    return train, valid, test


def choose_thresholds(p_valid: np.ndarray, y_valid: np.ndarray, policy: dict = POLICY) -> tuple[float, float]:
    """Step-up and block thresholds from VALIDATION genuine scores only.

    Derivation: false_decline = block_share + step_up_failure_rate * step_up_share <= ceiling * valid_headroom, with the
    step-up band capped at step_up_budget of genuine volume. Solve for the block share, then place both thresholds on the
    genuine score distribution. Nothing from the test window is used."""
    target = policy["max_false_decline"] * policy["valid_headroom"]
    block_share = target - policy["step_up_budget"] * policy["step_up_failure_rate"]
    assert block_share > 0, "step-up band too costly for the ceiling: shrink the budget or the failure rate"
    genuine = p_valid[y_valid == 0]
    t_block = float(np.quantile(genuine, 1 - block_share))
    t_step = float(np.quantile(genuine, 1 - block_share - policy["step_up_budget"]))
    return t_step, t_block


def apply_policy(p: np.ndarray, t_step: float, t_block: float) -> np.ndarray:
    return np.where(p >= t_block, "block", np.where(p >= t_step, "step_up", "allow"))


def policy_report(y: np.ndarray, action: np.ndarray, policy: dict = POLICY) -> dict:
    """The acceptance numbers: outcomes on genuine and on fraud volume across all three actions."""
    g, f = y == 0, y == 1
    count = lambda mask: {a: int((action[mask] == a).sum()) for a in DECISIONS}  # noqa: E731
    gc, fc = count(g), count(f)
    n_g = int(g.sum())
    return {"genuine_rows": n_g, "fraud_rows": int(f.sum()), "genuine": gc, "fraud": fc,
            "false_decline_rate": (gc["block"] + policy["step_up_failure_rate"] * gc["step_up"]) / n_g,
            "block_rate_on_genuine": gc["block"] / n_g, "step_up_rate_on_genuine": gc["step_up"] / n_g,
            "fraud_blocked": fc["block"] / max(1, int(f.sum())), "fraud_stepped_up": fc["step_up"] / max(1, int(f.sum())),
            "fraud_allowed": fc["allow"] / max(1, int(f.sum()))}


def log_features(X: pd.DataFrame) -> np.ndarray:
    return np.log1p(X[FEATURES].clip(lower=0).to_numpy())


def run(seed: int = 7, mode: str = "card", **gen_kwargs) -> dict:
    assert mode in MODES, mode
    df = build_features(generate(seed=seed, mode=mode, **gen_kwargs))
    train, valid, test = split(df, mode)
    Xtr, Xva, Xte = log_features(train), log_features(valid), log_features(test)

    # train on the label the rail actually reveals; evaluate on ground truth (a synthetic set is the only place that exists)
    base = make_pipeline(StandardScaler(), LogisticRegression(C=0.5, max_iter=2000))
    base = CalibratedClassifierCV(base, method="isotonic", cv=3).fit(Xtr, train.label)
    chal = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=120, min_samples_leaf=100,
                                          l2_regularization=5.0, random_state=seed)  # strong regularisation: ~200 positives
    chal.fit(train[FEATURES], train.label)

    report = {"mode": mode, "seed": seed, "rows": len(df), "fraud_rate": float(df.is_fraud.mean()), "test_rows": len(test),
              "test_fraud_rate": float(test.is_fraud.mean()), "policy_assumptions": dict(POLICY)}
    y_valid, y_test = valid.is_fraud.to_numpy(), test.is_fraud.to_numpy()
    scored = (("baseline_lr", base.predict_proba(Xva)[:, 1], base.predict_proba(Xte)[:, 1]),
              ("challenger_hgb", chal.predict_proba(valid[FEATURES])[:, 1], chal.predict_proba(test[FEATURES])[:, 1]))
    for name, p_valid, p_test in scored:
        t_step, t_block = choose_thresholds(p_valid, y_valid)
        report[name] = {"pr_auc": float(average_precision_score(test.is_fraud, p_test)),
                        "recall_at_0.5pct_fpr": recall_at_fpr(y_test, p_test),
                        "brier": float(brier_score_loss(test.is_fraud, p_test)),
                        "thresholds": {"step_up": t_step, "block": t_block},
                        "policy": policy_report(y_test, apply_policy(p_test, t_step, t_block))}
    return report


if __name__ == "__main__":
    rep = run(mode=sys.argv[1] if len(sys.argv) > 1 else "card")
    print(json.dumps(rep, indent=2))
    with open("report.json", "w") as fh:
        json.dump(rep, fh, indent=2)
    sys.exit(0)
