"""Per-skill running accuracy and a PFA-style logistic regression vs a gradient-boosted tracer, evaluated on
HELD-OUT STUDENTS with AUC, RMSE and calibration, plus the leakage trap: student-id target encoding.
Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import mean_squared_error, roc_auc_score

from features import FEATURES, item_logits, replay
from make_data import generate


def ece(y, p, bins: int = 10) -> float:
    q = pd.qcut(p, bins, duplicates="drop")
    g = pd.DataFrame({"y": y, "p": p, "q": q}).groupby("q", observed=True).agg(y=("y", "mean"), p=("p", "mean"), n=("y", "size"))
    return float((g.n * (g.y - g.p).abs()).sum() / g.n.sum())


def metrics(y, p) -> dict:
    return {"auc": float(roc_auc_score(y, p)), "rmse": float(mean_squared_error(y, p) ** 0.5), "ece": ece(np.asarray(y), np.asarray(p))}


PFA = ["correct_prev", "wrong_prev", "item_logit"]


def split_students(df: pd.DataFrame, seed: int = 21):
    ids = np.array(sorted(df.student.unique()))
    np.random.default_rng(seed).shuffle(ids)
    cut = int(0.75 * len(ids))
    return set(ids[:cut]), set(ids[cut:])


def run(seed: int = 21, **gen) -> dict:
    df = generate(seed=seed, **gen)
    tr_ids, te_ids = split_students(df, seed)
    train_raw, test_raw = df[df.student.isin(tr_ids)], df[df.student.isin(te_ids)]
    logits = item_logits(train_raw)
    train, test = replay(train_raw, logits), replay(test_raw, logits)
    out: dict = {"students": int(df.student.nunique()), "answers": len(df), "test_students": len(te_ids), "test_answers": len(test)}

    out["skill_running_accuracy"] = metrics(test.correct, test.ewma.clip(0.01, 0.99))
    pfa = LogisticRegression(max_iter=500).fit(train[PFA], train.correct)
    out["pfa_logistic"] = metrics(test.correct, pfa.predict_proba(test[PFA])[:, 1])
    gb = HistGradientBoostingClassifier(max_depth=4, learning_rate=0.07, max_iter=250, min_samples_leaf=80, l2_regularization=2.0,
                                        random_state=seed, categorical_features=[FEATURES.index("skill")])
    gb.fit(train[FEATURES], train.correct)
    out["gbdt_tracer"] = metrics(test.correct, gb.predict_proba(test[FEATURES])[:, 1])
    out["oracle_auc"] = float(roc_auc_score(test.correct, test.true_p))        # the ceiling: synthetic data knows the truth
    return out


def student_leakage_demo(seed: int = 21, **gen) -> dict:
    """Add a student-id target encoding (the student's mean correct rate in TRAINING rows). A random split of rows
    shares students between train and test and rewards it; a student split does not."""
    df = generate(seed=seed, **gen)
    rng = np.random.default_rng(seed)
    out = {}
    tr_ids, te_ids = split_students(df, seed)
    row_test = rng.random(len(df)) < 0.25
    for name, test_mask in (("random_row_split", row_test), ("student_split", df.student.isin(te_ids).to_numpy())):
        train_raw, test_raw = df[~test_mask], df[test_mask]
        logits = item_logits(train_raw)
        tr, te = replay(train_raw, logits), replay(test_raw, logits)
        te_enc = train_raw.groupby("student").correct.mean()
        glob = train_raw.correct.mean()
        for d in (tr, te):
            d["student_te"] = d.student.map(te_enc).fillna(glob)
        cols = PFA + ["student_te"]
        m = LogisticRegression(max_iter=500).fit(tr[cols], tr.correct)
        out[name] = float(roc_auc_score(te.correct, m.predict_proba(te[cols])[:, 1]))
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
    print(json.dumps({"auc_with_student_id_encoding": student_leakage_demo()}, indent=2))
