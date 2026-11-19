"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pandas as pd
import pytest

from baseline import UnionFind, candidate_pairs, cluster, evaluate, run
from make_data import generate


def test_generator_is_deterministic_and_most_entities_have_no_duplicate():
    a, b = generate(n_clusters=200), generate(n_clusters=200)
    assert a.equals(b)
    assert (a.groupby("cluster").size() == 1).mean() > 0.5


def test_a_few_hub_values_link_many_unrelated_entities():
    d = generate()
    h = d[d.net < 12]
    assert h.groupby("net").size().max() > 20                      # one value links dozens of entities ...
    assert h.cluster.nunique() > 0.8 * len(h)                      # ... that mostly belong to different real groups


def test_blocking_ignores_missing_values_and_finds_shared_ones():
    d = pd.DataFrame({"cluster": [0, 0, 1], "name": ["aaa", "aab", "ccc"], "phone": [5, 5, -1], "device": [1, 2, 3],
                      "address": [-1, -1, -1], "net": [10001, 10002, 10003]})
    assert list(candidate_pairs(d)) == [(0, 1)]


def test_connecting_anything_that_shares_a_value_is_transitive():
    uf = UnionFind(4)
    uf.union(0, 1); uf.union(1, 2)
    assert uf.find(0) == uf.find(2) and uf.find(3) != uf.find(0)
    assert list(cluster(4, [(0, 1), (1, 2)])).count(cluster(4, [(0, 1), (1, 2)])[0]) == 3


def test_pairwise_metrics_on_a_toy_example():
    truth = np.array([0, 0, 1, 1]); pred = np.array([7, 7, 7, 9])
    r = evaluate(truth, pred)
    assert r["pair_precision"] == pytest.approx(1 / 3) and r["pair_recall"] == pytest.approx(1 / 2)
    assert r["largest_cluster"] == 3


@pytest.fixture(scope="module")
def report():
    return run(seed=53)


def test_naive_linking_collapses_into_a_giant_false_component(report):
    n = report["any_shared_value"]
    assert n["largest_cluster"] >= 100 and n["pair_precision"] < 0.2, report


def test_rarity_weighted_pair_model_keeps_precision_and_recall(report):
    m = report["weighted_pair_model"]
    assert m["pair_precision"] >= 0.9 and m["pair_recall"] >= 0.7, report
    assert m["largest_cluster"] <= 30 and m["purity"] >= 0.95, report
