"""Executable gates for the uplift and causal-measurement engine."""

import numpy as np

from baseline import qini_auc, run
from make_data import generate, true_effect

R = run()


def test_generator_is_deterministic():
    assert generate(n=3000, seed=2).equals(generate(n=3000, seed=2))


def test_the_holdout_is_randomised_and_the_observational_part_is_not():
    assert abs(R["holdout_balance_smd_x0"]) < 0.1
    assert abs(R["observational_balance_smd_x0"]) > 0.3


def test_the_naive_comparison_is_biased_and_weighting_removes_most_of_it():
    assert R["naive_bias"] > 0.03
    assert abs(R["ipw_bias"]) < 0.6 * abs(R["naive_bias"])


def test_the_uplift_ranking_beats_random_targeting():
    assert R["t_learner_qini_auc"] > R["random_ranking_qini_auc"]


def test_top_decile_gains_more_than_the_bottom_decile():
    assert R["top_decile_realised_uplift"] > R["bottom_decile_realised_uplift"]


def test_qini_of_a_perfect_ranking_beats_the_inverse_ranking():
    rng = np.random.default_rng(0)
    d = generate(n=6000, seed=9)
    h = d[d.holdout]
    tau = true_effect(h[[f"x{i}" for i in range(5)]].to_numpy())
    good = qini_auc(tau + rng.normal(0, 1e-6, len(tau)), h.treated.to_numpy(), h.outcome.to_numpy())
    bad = qini_auc(-tau, h.treated.to_numpy(), h.outcome.to_numpy())
    assert good > bad
