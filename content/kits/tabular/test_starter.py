"""Executable exit gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pytest

from baseline import FEATURES, run, split
from features import DAY, build_features
from make_data import generate


@pytest.fixture(scope="module")
def tx():
    return generate(seed=7)


def test_generator_is_deterministic_and_realistically_imbalanced(tx):
    again = generate(seed=7)
    assert tx.equals(again)
    assert 0.002 < tx.label.mean() < 0.012  # fraud is rare; 50/50 data would hide every trap


def test_features_use_only_the_past(tx):
    """The canonical leakage test: deleting the future must not change any feature of the past."""
    cut = 60 * DAY
    full = build_features(tx).set_index("txn_id")
    past = build_features(tx[tx.ts <= cut]).set_index("txn_id")
    common = past.index
    a, b = full.loc[common, FEATURES].to_numpy(), past[FEATURES].to_numpy()
    assert np.allclose(a, b, equal_nan=True), "a feature changed when future rows were removed -> leakage"


def test_velocity_windows_exclude_the_current_event():
    import pandas as pd
    t = pd.DataFrame({"txn_id": [0, 1, 2], "ts": [0.0, 30.0, 61.0], "entity": [1, 1, 1], "group": [9, 9, 9],
                      "counterparty": [5, 5, 5], "amount": [10.0, 20.0, 30.0], "label": [0, 0, 0],
                      "label_ts": [1e9, 1e9, 1e9]})
    f = build_features(t).set_index("txn_id")
    assert list(f.entity_cnt_1m) == [0, 1, 1]          # row 2 sees only the event at t=30 (t=0 is 61 s old)
    assert list(f.entity_sum_1h) == [0, 10, 30]


def test_training_rows_have_matured_labels(tx):
    train, _, test = split(build_features(tx))
    assert train.ts.max() < test.ts.min()
    assert train.label_ts.max() < test.ts.min()


def test_baseline_clears_the_gate_and_challenger_earns_its_complexity():
    rep = run(seed=7)
    base, chal = rep["baseline_lr"], rep["challenger_hgb"]
    assert base["recall_at_0.5pct_fpr"] >= 0.60, rep      # M2 gate
    assert base["pr_auc"] >= 0.55, rep
    assert chal["pr_auc"] >= 0.95 * base["pr_auc"], rep   # M3 gate: no regression for the added complexity
