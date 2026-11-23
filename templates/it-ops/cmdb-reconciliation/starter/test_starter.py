"""Executable gates for the multi-class engine."""

from baseline import chronological_group_split, ece_top_label, run
from make_data import generate

import numpy as np

R = run()


def test_generator_is_deterministic():
    assert generate(n=1500, seed=4).equals(generate(n=1500, seed=4))


def test_no_entity_is_on_both_sides_of_the_split():
    tr, te = chronological_group_split(generate(n=4000, seed=5))
    assert not set(tr["group"]) & set(te["group"])
    assert tr["t"].max() <= te["t"].max()


def test_model_beats_the_majority_class():
    assert R["baseline_lr"]["accuracy"] > R["majority_class_accuracy"] + 0.05
    assert R["challenger_hgb"]["macro_f1"] > 0.35


def test_random_split_inflates_the_score():
    assert R["leaky_split_inflation"] > 0.02


def test_the_class_prior_drifts():
    assert R["test_class_shares"][4] > R["train_class_shares"][4] + 0.03


def test_ece_is_zero_for_a_perfectly_calibrated_toy():
    p = np.array([[1.0, 0.0], [0.0, 1.0]])
    assert ece_top_label(p, np.array([0, 1])) == 0.0
