"""Fixed-threshold early-warning score vs a gradient-boosted model, judged the way a ward would judge it:
lead time and sensitivity at a FIXED alert burden, with patients (not rows) split between train and test.
Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier

from features import FEATURES, build_features, mews_like
from make_data import generate

BURDEN_PER_100_PD = 10.0   # alert budget: 1 alert per 10 patient-days
REFRACTORY_H = 12          # after an alert, stay quiet for 12 h
HORIZON_H = 24             # an alert more than 24 h before onset counts as a false alarm


def split_patients(df: pd.DataFrame, seed: int = 11):
    rng = np.random.default_rng(seed)
    pids = df.pid.unique()
    rng.shuffle(pids)
    n = len(pids)
    return set(pids[: int(.6 * n)]), set(pids[int(.6 * n): int(.8 * n)]), set(pids[int(.8 * n):])


def alert_policy(scores: np.ndarray, thr: float) -> list[int]:
    idx, out, last = np.flatnonzero(scores >= thr), [], -10**9
    for i in idx:
        if i - last >= REFRACTORY_H:
            out.append(int(i))
            last = int(i)
    return out


def evaluate(f: pd.DataFrame, score: np.ndarray, thr: float) -> dict:
    f = f.assign(score=score)
    false_alerts = patient_hours = detected = n_sepsis = 0
    leads: list[float] = []
    for _, g in f.groupby("pid", sort=False):
        g = g.sort_values("hour")
        onset = int(g.onset_hour.iloc[0])
        g = g[g.censored == 0]                         # nothing after onset counts
        alerts = alert_policy(g.score.to_numpy(), thr)
        hours = g.hour.to_numpy()
        patient_hours += len(g)
        if onset >= 0:
            n_sepsis += 1
            good = [hours[a] for a in alerts if onset - hours[a] <= HORIZON_H]
            false_alerts += len([a for a in alerts if onset - hours[a] > HORIZON_H])
            if good:
                detected += 1
                leads.append(float(onset - good[0]))
        else:
            false_alerts += len(alerts)
    return {"alerts_per_100_patient_days": 100 * false_alerts / (patient_hours / 24),
            "sensitivity": detected / max(n_sepsis, 1),
            "median_lead_time_h": float(np.median(leads)) if leads else 0.0, "n_sepsis": n_sepsis}


def pick_threshold(f: pd.DataFrame, score: np.ndarray, burden: float = BURDEN_PER_100_PD) -> float:
    """Smallest threshold whose burden on the validation set stays within budget."""
    cands = np.unique(np.quantile(score, np.linspace(0.80, 0.9995, 40)))
    for t in cands:
        if evaluate(f, score, t)["alerts_per_100_patient_days"] <= burden:
            return float(t)
    return float(cands[-1])


def run(seed: int = 11, **gen) -> dict:
    raw = generate(seed=seed, **gen)
    f = build_features(raw)
    tr_p, va_p, te_p = split_patients(raw, seed)
    train, valid, test = (f[f.pid.isin(p)] for p in (tr_p, va_p, te_p))
    tr_fit = train[train.censored == 0]
    model = HistGradientBoostingClassifier(max_depth=4, learning_rate=0.06, max_iter=200, min_samples_leaf=60,
                                           l2_regularization=2.0, random_state=seed)
    model.fit(tr_fit[FEATURES], tr_fit.y_next6h)
    out = {"patients": int(raw.pid.nunique()), "train_patients": len(tr_p), "test_patients": len(te_p)}
    for name, sv, st in (("mews_like", mews_like(valid).to_numpy(), mews_like(test).to_numpy()),
                         ("gbdt", model.predict_proba(valid[FEATURES])[:, 1], model.predict_proba(test[FEATURES])[:, 1])):
        thr = pick_threshold(valid, sv)
        out[name] = {"threshold": thr, **evaluate(test, st, thr)}
    return out


if __name__ == "__main__":
    rep = run()
    print(json.dumps(rep, indent=2))
