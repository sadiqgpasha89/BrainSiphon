"""Executable gates for the generative-output engine."""

import numpy as np

from baseline import FILLER, checks, cohen_kappa, generate_output, run
from make_data import golden_set

R = run()
ITEM = {"id": 0, "entity": "Meridian Bank", "amount": 12000, "date": "2025-03-12", "max_words": 40}


def test_golden_set_is_deterministic():
    assert golden_set(20, 3) == golden_set(20, 3)


def test_each_check_catches_its_planted_failure():
    good = "Meridian Bank reported 12,000 on 2025-03-12."
    assert all(checks(ITEM, good, "strict").values())
    assert not checks(ITEM, good.replace("12,000", "13,200"), "strict")["amount_correct"]
    assert not checks(ITEM, "Meridian Bank reported a figure.", "strict")["date_correct"]
    assert not checks(ITEM, good + " " + (FILLER + " ") * 5, "strict")["within_length"]
    assert not checks(ITEM, good + " We guarantee it.", "strict")["no_forbidden_claims"]


def test_the_fuzzy_judge_accepts_valid_formats_the_strict_judge_rejects():
    alt = "Meridian Bank reported 12.0k on 12 Mar 2025."
    assert not checks(ITEM, alt, "strict")["amount_correct"]
    assert all(checks(ITEM, alt, "fuzzy").values())


def test_judges_disagree_enough_to_matter_but_not_completely():
    assert 0.05 < R["judge_disagreement_share_v1"] < 0.7
    assert 0.1 < R["judge_agreement_kappa_v1"] < 0.95


def test_the_better_generator_is_detected_beyond_noise():
    assert R["v2_minus_v1"] > 0
    assert R["v2_minus_v1_ci95"][0] > 0


def test_small_golden_sets_give_wide_intervals():
    assert R["ci_width_at_60_items"] > 1.5 * R["ci_width_at_full_set"]


def test_kappa_of_identical_and_opposite_judgements():
    a = np.array([True, False, True, False])
    assert cohen_kappa(a, a) == 1.0 and cohen_kappa(a, ~a) == -1.0


def test_generation_is_deterministic_given_a_seed():
    assert generate_output(ITEM, "v1", np.random.default_rng(1)) == generate_output(ITEM, "v1", np.random.default_rng(1))
