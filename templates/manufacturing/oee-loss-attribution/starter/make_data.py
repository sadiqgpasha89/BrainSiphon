"""Engine: treatment-effect and causal measurement (uplift modelling, incrementality, A/B analysis with confounding).

A synthetic population where the true effect of the treatment is known, so every estimator can be scored against the truth:
  * treatment was NOT assigned at random in the observational part: people with high x0 were more likely to be treated, and
    x0 also raises the outcome, so a naive difference of means is biased upward
  * a randomised holdout (a fraction of rows with a fair coin) gives an honest place to evaluate a ranking
  * the effect is heterogeneous: positive for some, and negative for a small group (the "sleeping dogs")
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def sigmoid(z):
    return 1 / (1 + np.exp(-z))


def true_effect(x: np.ndarray) -> np.ndarray:
    return 0.12 * (x[:, 1] > 0) - 0.07 * ((x[:, 2] > 0.5) & (x[:, 1] <= 0)) + 0.02


def generate(n: int = 40_000, seed: int = 31, confound: float = 1.2, holdout: float = 0.15) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    x = rng.normal(size=(n, 5))
    base = sigmoid(-1.4 + 0.9 * x[:, 0] + 0.5 * x[:, 3])
    tau = true_effect(x)
    in_holdout = rng.random(n) < holdout
    propensity = sigmoid(confound * x[:, 0])
    w = np.where(in_holdout, rng.random(n) < 0.5, rng.random(n) < propensity)
    p = np.clip(base + w * tau, 0.001, 0.999)
    y = (rng.random(n) < p).astype(int)
    cols = {f"x{i}": x[:, i] for i in range(5)}
    return pd.DataFrame({**cols, "treated": w.astype(int), "outcome": y, "holdout": in_holdout, "true_tau": tau})


if __name__ == "__main__":
    d = generate()
    print(f"{len(d)} rows, treated {d.treated.mean():.2%}, true ATE {d.true_tau.mean():+.4f}")
