"""Popularity, bag-of-items co-visitation, ordered transitions and a theme-aware transition model for
next-item recommendation, evaluated leave-last-out on a TIME split with HitRate@20, MRR@20 and coverage.
Run:  python baseline.py"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from scipy import sparse

K = 20
TRAIN_END, TEST_START = 21, 24         # days < 21 train, a gap day, days >= 24 test (the sale starts day 22)


_CACHE: dict = {}


def data(seed: int, **gen) -> pd.DataFrame:
    from make_data import generate
    key = (seed, tuple(sorted(gen.items())))
    if key not in _CACHE:
        _CACHE[key] = generate(seed=seed, **gen)
    return _CACHE[key]


def sessions_of(df: pd.DataFrame) -> list[np.ndarray]:
    d = df.sort_values(["session", "step"])
    return [g.item.to_numpy() for _, g in d.groupby("session", sort=True)]


def bot_filter(df: pd.DataFrame, min_dwell: float = 1.0) -> pd.DataFrame:
    """Drop sessions whose median dwell is implausibly short: humans do not read an item page in under a second."""
    med = df.groupby("session").dwell_s.median()
    return df[df.session.isin(med[med >= min_dwell].index)]


class Models:
    def __init__(self, seqs: list[np.ndarray], n_items: int, item_cat: np.ndarray | None = None):
        self.n = n_items
        self.cat = item_cat
        self.pop = np.bincount(np.concatenate(seqs), minlength=n_items).astype(float)
        r, c = [], []
        for s in seqs:
            r += list(s[:-1]); c += list(s[1:])
        self.T = sparse.csr_matrix((np.ones(len(r)), (r, c)), shape=(n_items, n_items))           # ordered: prev -> next
        rb, cb = [], []
        for s in seqs:
            for i, a in enumerate(s):
                for b in s[max(0, i - 3): i]:
                    rb += [a, b]; cb += [b, a]
        self.B = sparse.csr_matrix((np.ones(len(rb)), (rb, cb)), shape=(n_items, n_items))        # bag: either direction

    def popularity(self, prefix):
        return self.pop.copy()

    def bag(self, prefix):
        return self.B[prefix[-1]].toarray().ravel() + 1e-3 * self.pop

    def ordered(self, prefix):
        return self.T[prefix[-1]].toarray().ravel() + 1e-3 * self.pop

    def theme_aware(self, prefix, boost: float = 1.0, alpha: float = 0.0):
        """Ordered transitions from the last item, boosted toward the session's theme category, corrected for popularity."""
        row = self.T[prefix[-1]].toarray().ravel()
        theme = np.bincount(self.cat[prefix], minlength=self.cat.max() + 1) / len(prefix)
        s = (row / (row.sum() + 5.0) + 0.002) * (1 + boost * theme[self.cat]) / (self.pop + 1.0) ** alpha
        return s


def evaluate(model_fn, test_seqs: list[np.ndarray], n_items: int) -> dict:
    hits = rr = 0.0
    seen_recs = set()
    n = 0
    for s in test_seqs:
        if len(s) < 3:
            continue
        prefix, target = s[:-1], s[-1]
        scores = model_fn(prefix).copy()
        scores[prefix] = -np.inf                                    # never recommend what the user just saw
        k = min(K, len(scores) - 1)
        top = np.argpartition(-scores, k)[:k]
        top = top[np.argsort(-scores[top])]
        seen_recs.update(top.tolist())
        n += 1
        w = np.flatnonzero(top == target)
        if w.size:
            hits += 1
            rr += 1 / (w[0] + 1)
    return {"hit_rate@20": hits / n, "mrr@20": rr / n, "coverage": len(seen_recs) / n_items, "sessions": n}


def run(seed: int = 9, filter_bots: bool = True, **gen) -> dict:
    df = data(seed, **gen)
    n_items = int(df.item.max()) + 1
    item_cat = df.drop_duplicates("item").set_index("item").category.reindex(range(n_items)).fillna(0).astype(int).to_numpy()
    train_df = df[df.day < TRAIN_END]
    train_df = bot_filter(train_df) if filter_bots else train_df
    test_df = bot_filter(df[df.day >= TEST_START])                   # humans only in the evaluation either way
    m = Models(sessions_of(train_df), n_items, item_cat)
    test = sessions_of(test_df)
    out = {"train_sessions": int(train_df.session.nunique()), "test_sessions": len(test)}
    for name, fn in (("popularity", m.popularity), ("bag_covisit", m.bag), ("ordered_transition", m.ordered),
                     ("theme_aware", m.theme_aware)):
        out[name] = evaluate(fn, test, n_items)
    return out


def leakage_demo(seed: int = 9, **gen) -> dict:
    """Same model, two splits: random sessions vs time. The random split is optimistic because the sale's
    popularity shift (day 22+) appears on both sides of it."""
    df = bot_filter(data(seed, **gen))
    n_items = int(df.item.max()) + 1
    rng = np.random.default_rng(seed)
    sess = df.session.unique()
    test_ids = set(rng.choice(sess, int(0.2 * len(sess)), replace=False))
    rnd_train, rnd_test = df[~df.session.isin(test_ids)], df[df.session.isin(test_ids)]
    late = df[df.day >= TEST_START]
    time_train, time_test = df[df.day < TRAIN_END], late
    res = {}
    for name, (a, b) in {"random_split": (rnd_train, rnd_test), "time_split": (time_train, time_test)}.items():
        mdl = Models(sessions_of(a), n_items)
        res[name] = {"popularity": evaluate(mdl.popularity, sessions_of(b), n_items)["hit_rate@20"],
                     "ordered_transition": evaluate(mdl.ordered, sessions_of(b), n_items)["hit_rate@20"]}
    return res


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
    print(json.dumps({"bots_left_in_training": run(filter_bots=False)["theme_aware"], "hit_rate_by_split": leakage_demo()}, indent=2))
