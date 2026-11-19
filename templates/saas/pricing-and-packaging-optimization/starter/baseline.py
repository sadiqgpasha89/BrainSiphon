"""Learn a policy from logged decisions, then ask: how good is it? Four offline estimators are compared with the true value.
  naive      average reward of the logged rows where the logger happened to choose what the new policy would choose (biased)
  ips        inverse-propensity weighting (unbiased, high variance when propensities are small)
  snips      self-normalised IPS (small bias, much lower variance)
  dr         doubly robust: a reward model plus an IPS correction
Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np
from sklearn.linear_model import LogisticRegression

from make_data import D, K, log_data, true_value


def fit_reward_models(x, a, r):
    return [LogisticRegression(C=1.0, max_iter=1000).fit(x[a == k], r[a == k]) for k in range(K)]


def predict_all(models, x):
    return np.column_stack([m.predict_proba(x)[:, 1] for m in models])


def estimators(log, policy_actions, models, clip: float = 0.02) -> dict:
    x, a, r, p = log["x"], log["a"], log["r"], log["propensity"]
    match = (policy_actions == a).astype(float)
    naive = float(r[match == 1].mean()) if match.any() else float("nan")
    w = match / np.maximum(p, clip)                                          # clipping bounds the variance
    ips = float((w * r).mean())
    snips = float((w * r).sum() / max(w.sum(), 1e-9))
    q = predict_all(models, x)
    dm = q[np.arange(len(a)), policy_actions]
    dr = float((dm + w * (r - q[np.arange(len(a)), a])).mean())
    return {"naive_matched": naive, "ips": ips, "snips": snips, "doubly_robust": dr, "match_rate": float(match.mean())}


def run(seed: int = 83, **gen) -> dict:
    log, w = log_data(seed=seed, **gen)
    n = len(log["r"])
    tr = np.arange(n) < n // 2                                               # learn on the first half, evaluate on the second
    models = fit_reward_models(log["x"][tr], log["a"][tr], log["r"][tr])
    best_constant = int(np.argmax([log["r"][tr][log["a"][tr] == k].mean() for k in range(K)]))
    policies = {"always_best_average_action": lambda x: np.full(len(x), best_constant),
                "learned_greedy": lambda x: predict_all(models, x).argmax(axis=1)}
    ev = {k: v[~tr] if hasattr(v, "__len__") and len(v) == n else v for k, v in log.items() if k != "all_propensities"}
    out = {"logged_rows": n, "logging_reward_rate": float(log["r"].mean())}
    for name, pol in policies.items():
        est = estimators(ev, pol(ev["x"]), models)
        out[name] = {"true_value": true_value(w, pol), **{k: round(v, 4) for k, v in est.items()}}
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
