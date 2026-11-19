"""Clustering engine: unscaled k-means against robust scaling, k chosen from data, with stability and drift checks.

    python baseline.py     -> prints the report (also returned by run())
"""

from __future__ import annotations

import json

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.preprocessing import RobustScaler

from make_data import K_TRUE, generate

FEATURES = [f"f{i}" for i in range(8)]


def robust_matrix(df) -> np.ndarray:
    Z = RobustScaler().fit_transform(df[FEATURES].to_numpy())
    return np.clip(Z, -6, 6)  # winsorise: an outlier may not own a cluster centre


def fit(Z: np.ndarray, k: int, seed: int = 0) -> KMeans:
    return KMeans(n_clusters=k, n_init=5, random_state=seed).fit(Z)


def choose_k(Z: np.ndarray, lo: int = 3, hi: int = 9, seed: int = 0, min_share: float = 0.02) -> int:
    """Best silhouette among the k whose smallest cluster, fitted on all rows, is a real segment: a sliver of outliers is not one."""
    sub = Z[np.random.default_rng(seed).choice(len(Z), min(2500, len(Z)), replace=False)]
    scores = {}
    for k in range(lo, hi + 1):
        model = fit(Z, k, seed)
        if np.bincount(model.labels_, minlength=k).min() / len(Z) >= min_share:
            scores[k] = silhouette_score(sub, model.predict(sub))
    return max(scores, key=scores.get) if scores else lo


def stability(Z: np.ndarray, k: int, rounds: int = 4, seed: int = 0) -> float:
    """Mean adjusted Rand index between fits on bootstrap samples, each used to label every row."""
    rng = np.random.default_rng(seed)
    labels = []
    for _ in range(rounds):
        idx = rng.choice(len(Z), len(Z), replace=True)
        labels.append(fit(Z[idx], k, int(rng.integers(0, 1000))).predict(Z))
    pairs = [adjusted_rand_score(labels[i], labels[j]) for i in range(rounds) for j in range(i + 1, rounds)]
    return float(np.mean(pairs))


def run(seed: int = 51, **gen) -> dict:
    df = generate(seed=seed, **gen)
    truth = df["segment"].to_numpy()
    raw = df[FEATURES].to_numpy()
    raw_labels = fit(raw, K_TRUE).labels_
    Z = robust_matrix(df)
    k = choose_k(Z)
    labels = fit(Z, k).labels_
    fixed = fit(Z, K_TRUE).labels_
    sizes = np.bincount(labels, minlength=k) / len(labels)
    early, late = df["t"] <= 0.8, df["t"] > 0.8
    early_mix = np.bincount(fit(Z, K_TRUE).predict(Z[early.to_numpy()]), minlength=K_TRUE) / early.sum()
    late_mix = np.bincount(fit(Z, K_TRUE).predict(Z[late.to_numpy()]), minlength=K_TRUE) / late.sum()
    m = 0.5 * (early_mix + late_mix)
    kl = lambda p, q: float(np.sum(np.where(p > 0, p * np.log(p / np.maximum(q, 1e-12)), 0)))
    return {
        "rows": len(df),
        "true_segments": K_TRUE,
        "unscaled_ari": float(adjusted_rand_score(truth, raw_labels)),
        "robust_scaled_ari_at_true_k": float(adjusted_rand_score(truth, fixed)),
        "chosen_k": int(k),
        "robust_scaled_ari_at_chosen_k": float(adjusted_rand_score(truth, labels)),
        "silhouette": float(silhouette_score(Z[:2500], labels[:2500])),
        "bootstrap_stability_ari": stability(Z, K_TRUE),
        "smallest_segment_share": float(sizes.min()),
        "unconstrained_k_smallest_share": float(np.bincount(fit(Z, choose_k(Z, min_share=0.0)).labels_).min() / len(Z)),
        "segment_mix_shift_js": float(0.5 * kl(early_mix, m) + 0.5 * kl(late_mix, m)),
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
