"""Pixels + logistic regression (the shortcut-friendly baseline) versus local-contrast features with brightness augmentation,
trained on site A and judged on held-out site A items and on site B.  Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.preprocessing import StandardScaler

from make_data import SIZE, generate

PIX = [f"p{k}" for k in range(SIZE * SIZE)]


def box_blur(imgs: np.ndarray, k: int = 7) -> np.ndarray:
    n = imgs.shape[0]
    a = imgs.reshape(n, SIZE, SIZE)
    pad = k // 2
    p = np.pad(a, ((0, 0), (pad, pad), (pad, pad)), mode="edge")
    out = np.zeros_like(a)
    for dy in range(k):
        for dx in range(k):
            out += p[:, dy:dy + SIZE, dx:dx + SIZE]
    return out / (k * k)


def contrast_features(imgs: np.ndarray) -> np.ndarray:
    """Pooled local contrast: how strongly the most unusual spot stands out from its neighbourhood (a hand-made max-pool).
    Overall brightness cancels out, and dividing by the image's own noise level makes the score transfer across sites."""
    a = imgs.reshape(-1, SIZE, SIZE)
    c = (a - box_blur(imgs)).reshape(len(imgs), -1)
    srt = np.sort(c, axis=1)
    scale = np.median(np.abs(c - np.median(c, axis=1, keepdims=True)), axis=1, keepdims=True) * 1.4826 + 1e-6   # per-image noise level
    return np.column_stack([srt[:, -1], srt[:, -5:].mean(axis=1), srt[:, -20:].mean(axis=1)]) / scale


def augment(imgs: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    return imgs + rng.uniform(-0.2, 0.2, (len(imgs), 1)) + rng.normal(0, 0.02, imgs.shape)     # brightness jitter


def sens_at_spec(y, s, spec: float = 0.95) -> float:
    fpr, tpr, _ = roc_curve(y, s)
    return float(np.interp(1 - spec, fpr, tpr))


def fit_score(Xtr, ytr, Xte_sets):
    sc = StandardScaler().fit(Xtr)
    m = LogisticRegression(C=0.05, max_iter=2000).fit(sc.transform(Xtr), ytr)
    return {k: m.predict_proba(sc.transform(X))[:, 1] for k, X in Xte_sets.items()}


def run(seed: int = 71, **gen) -> dict:
    df = generate(seed=seed, **gen)
    rng = np.random.default_rng(seed)
    A, B = df[df.site == 0], df[df.site == 1]
    groups = A.group.unique()
    test_g = set(rng.choice(groups, int(0.3 * len(groups)), replace=False))         # split by physical item, not by image
    trainA, testA = A[~A.group.isin(test_g)], A[A.group.isin(test_g)]
    out = {"images": len(df), "train": len(trainA), "prevalence": float(df.label.mean())}

    sets = {"site_A_heldout": testA[PIX].to_numpy(), "site_B": B[PIX].to_numpy()}
    ys = {"site_A_heldout": testA.label.to_numpy(), "site_B": B.label.to_numpy()}
    for name, (Xtr, Xsets) in {
        "pixels_lr": (trainA[PIX].to_numpy(), sets),
        "contrast_aug_lr": (contrast_features(np.vstack([trainA[PIX].to_numpy(), augment(trainA[PIX].to_numpy(), rng)])),
                            {k: contrast_features(v) for k, v in sets.items()}),
    }.items():
        ytr = trainA.label.to_numpy() if name == "pixels_lr" else np.concatenate([trainA.label.to_numpy()] * 2)
        scores = fit_score(Xtr, ytr, Xsets)
        res = {k: {"auc": float(roc_auc_score(ys[k], s)), "sens_at_95_spec": sens_at_spec(ys[k], s)} for k, s in scores.items()}
        # the operating point is chosen at site A (95% specificity) and carried to site B unchanged, as a deployed threshold would be
        thr = float(np.quantile(scores["site_A_heldout"][ys["site_A_heldout"] == 0], 0.95))
        sb, yb = scores["site_B"], ys["site_B"]
        res["site_B_at_A_threshold"] = {"sensitivity": float((sb[yb == 1] >= thr).mean()), "false_positive_rate": float((sb[yb == 0] >= thr).mean())}
        out[name] = res
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
