"""Executable gates for the survival engine."""

import numpy as np

from baseline import concordance, kaplan_meier, run
from make_data import generate

R = run()


def test_generator_is_deterministic():
    assert generate(n=2000, seed=6).equals(generate(n=2000, seed=6))


def test_kaplan_meier_on_a_known_case():
    time = np.array([1.0, 2.0, 3.0, 4.0])
    event = np.array([1, 0, 1, 0])
    # S(1)=3/4; subject censored at 2 leaves the risk set; S(3)=3/4 * (1 - 1/2) = 3/8
    assert abs(kaplan_meier(time, event, 3) - 0.375) < 1e-12


def test_concordance_of_a_perfect_and_a_reversed_ranking():
    t, e = np.array([1.0, 2.0, 3.0]), np.array([1, 1, 1])
    assert concordance(np.array([3.0, 2.0, 1.0]), t, e) == 1.0
    assert concordance(np.array([1.0, 2.0, 3.0]), t, e) == 0.0


def test_censoring_is_substantial_and_dropping_censored_rows_is_biased():
    assert R["censored_share"] > 0.3
    assert R["count_all_rows_bias_vs_km"] < -0.03  # counting every censored subject as "no event" understates the rate


def test_the_hazard_model_ranks_better_than_chance():
    assert R["c_index"] > 0.6


def test_predicted_risk_is_calibrated_across_deciles():
    assert R["decile_calibration_mean_abs_gap"] < 0.06
