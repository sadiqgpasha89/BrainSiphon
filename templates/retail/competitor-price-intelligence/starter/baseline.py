"""Two ways to turn shared attributes into clusters, judged on pairwise precision/recall, purity and the size of the largest
cluster (the giant-component alarm).  Run:  python baseline.py"""

from __future__ import annotations

import json
from collections import defaultdict
from itertools import combinations

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

from make_data import generate

ATTRS = ["phone", "device", "address", "net"]


class UnionFind:
    def __init__(self, n):
        self.p = list(range(n))

    def find(self, a):
        while self.p[a] != a:
            self.p[a] = self.p[self.p[a]]
            a = self.p[a]
        return a

    def union(self, a, b):
        self.p[self.find(a)] = self.find(b)


def candidate_pairs(df: pd.DataFrame) -> dict[tuple[int, int], list[str]]:
    """Blocking: every pair sharing at least one attribute value, with the attributes they share."""
    pairs: dict[tuple[int, int], list[str]] = defaultdict(list)
    for a in ATTRS:
        for _, idx in df.groupby(a).indices.items():
            if len(idx) < 2 or df[a].iloc[idx[0]] == -1:
                continue
            for i, j in combinations(sorted(idx), 2):
                pairs[(int(i), int(j))].append(a)
    return pairs


def ngrams(s: str) -> set[str]:
    return {s[i:i + 3] for i in range(len(s) - 2)}


def pair_features(df: pd.DataFrame, pairs: dict) -> tuple[list, np.ndarray]:
    size = {a: df.groupby(a).size() for a in ATTRS}
    keys, rows = [], []
    for (i, j), shared in pairs.items():
        ni, nj = ngrams(df.name.iloc[i]), ngrams(df.name.iloc[j])
        sim = len(ni & nj) / max(len(ni | nj), 1)
        # weight each shared value by how rare it is: a value shared by 3 entities says far more than one shared by 300
        w = {a: (1.0 / np.log2(1 + size[a][df[a].iloc[i]])) if a in shared else 0.0 for a in ATTRS}
        rows.append([w["phone"], w["device"], w["address"], w["net"], len(shared), sim, np.log1p(max(size[a][df[a].iloc[i]] for a in shared))])
        keys.append((i, j))
    return keys, np.array(rows)


def cluster(n: int, links: list[tuple[int, int]]) -> np.ndarray:
    uf = UnionFind(n)
    for i, j in links:
        uf.union(i, j)
    return np.array([uf.find(i) for i in range(n)])


def evaluate(truth: np.ndarray, pred: np.ndarray) -> dict:
    ct = pd.crosstab(truth, pred).to_numpy()
    pairs = lambda x: (x * (x - 1) / 2).sum()                             # noqa: E731
    tp = pairs(ct)
    p_pred, p_true = pairs(ct.sum(axis=0)), pairs(ct.sum(axis=1))
    purity = float(ct.max(axis=0).sum() / ct.sum())
    return {"pair_precision": float(tp / max(p_pred, 1)), "pair_recall": float(tp / max(p_true, 1)),
            "purity": purity, "largest_cluster": int(ct.sum(axis=0).max())}


def run(seed: int = 53, **gen) -> dict:
    df = generate(seed=seed, **gen)
    rng = np.random.default_rng(seed)
    clusters = df.cluster.unique()
    test_c = set(rng.choice(clusters, int(0.4 * len(clusters)), replace=False))
    is_test = df.cluster.isin(test_c).to_numpy()
    train, test = df[~is_test].reset_index(drop=True), df[is_test].reset_index(drop=True)

    tr_pairs = candidate_pairs(train)
    keys, X = pair_features(train, tr_pairs)
    y = np.array([train.cluster.iloc[i] == train.cluster.iloc[j] for i, j in keys])
    model = LogisticRegression(C=2.0, max_iter=2000).fit(X, y)

    te_pairs = candidate_pairs(test)
    te_keys, Xte = pair_features(test, te_pairs)
    truth = test.cluster.to_numpy()
    out = {"entities": len(df), "test_entities": len(test), "candidate_pairs_test": len(te_keys),
           "hub_pairs_share": float(np.mean([("net" in s and len(s) == 1) for s in te_pairs.values()]))}
    out["any_shared_value"] = evaluate(truth, cluster(len(test), te_keys))
    p = model.predict_proba(Xte)[:, 1]
    out["weighted_pair_model"] = evaluate(truth, cluster(len(test), [k for k, q in zip(te_keys, p) if q > 0.5]))
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
