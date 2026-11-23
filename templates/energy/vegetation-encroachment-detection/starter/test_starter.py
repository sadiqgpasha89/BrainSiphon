"""Executable gates for the regression engine."""

import numpy as np

from baseline import design, errors, run, split
from make_data import generate

R = run()


def test_generator_is_deterministic():
    a, b = generate(n=2000, seed=3), generate(n=2000, seed=3)
    assert a.equals(b)


def test_split_is_chronological():
    tr, te = split(generate(n=3000, seed=2))
    assert tr["t"].max() <= te["t"].min()


def test_leaky_column_is_not_a_feature():
    df = generate(n=500, seed=1)
    assert "settled_amount" not in [c for c in ["x1", "x2", "x3", "x4"]]
    assert design(df).shape[1] == 4 + 4  # four numeric features plus the one-hot segment


def test_leaky_model_would_look_far_better_than_the_honest_one():
    assert R["leaky_feature_rmse"] < 0.5 * R["honest_rmse"]


def test_challenger_earns_its_complexity():
    assert R["mae_gain_vs_baseline"] > 0.05


def test_interval_coverage_is_close_to_nominal():
    assert 0.65 <= R["interval_80_coverage"] <= 0.92


def test_a_global_error_hides_the_worst_segment():
    assert R["worst_segment_vs_overall"] > 1.2


def test_errors_are_exact_on_a_known_case():
    m = errors(np.array([10.0, 20.0]), np.array([12.0, 18.0]))
    assert m["mae"] == 2.0 and abs(m["rmse"] - 2.0) < 1e-12
