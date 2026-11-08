"""Reference kit: decisions from logged data (offers, pricing, notifications, routing choices, treatments, ranking policies).

A contextual bandit with a known ground truth, so you can compare what offline estimators SAY a new policy is worth with what it is
REALLY worth when run:
  * context x (5 features), K = 4 actions, reward 1/0 from a hidden logistic model per action
  * the LOGGING policy is biased: it favours some actions for some contexts and records the probability it chose each action
  * the new policy will choose differently from the logger, so most logged rows say nothing about it
"""

from __future__ import annotations

import numpy as np

D, K = 5, 4


def sigmoid(z):
    return 1 / (1 + np.exp(-z))


def world(seed: int = 83):
    rng = np.random.default_rng(seed)
    return {"theta": rng.normal(0, 0.9, (K, D)), "bias": rng.normal(-0.6, 0.4, K), "w_log": rng.normal(0, 0.8, (K, D))}


def true_prob(w, x):
    return sigmoid(x @ w["theta"].T + w["bias"])                       # (n, K)


def log_data(n: int = 30_000, seed: int = 83, logging_temperature: float = 1.0):
    w = world(seed)
    rng = np.random.default_rng(seed + 1)
    x = rng.normal(0, 1, (n, D))
    logits = (x @ w["w_log"].T) / logging_temperature
    prop = np.exp(logits - logits.max(axis=1, keepdims=True))
    prop /= prop.sum(axis=1, keepdims=True)
    a = np.array([rng.choice(K, p=p) for p in prop])
    r = (rng.random(n) < true_prob(w, x)[np.arange(n), a]).astype(int)
    return {"x": x, "a": a, "r": r, "propensity": prop[np.arange(n), a], "all_propensities": prop}, w


def true_value(w, policy, n: int = 40_000, seed: int = 999) -> float:
    """What a policy would really earn: simulate fresh contexts and use the hidden reward probabilities."""
    x = np.random.default_rng(seed).normal(0, 1, (n, D))
    return float(true_prob(w, x)[np.arange(n), policy(x)].mean())


if __name__ == "__main__":
    log, w = log_data()
    print(f"{len(log['r']):,} logged decisions, reward rate {log['r'].mean():.1%}, smallest propensity {log['propensity'].min():.4f}")
