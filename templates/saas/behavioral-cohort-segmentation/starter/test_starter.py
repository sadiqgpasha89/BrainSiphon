"""Executable gates for the clustering engine."""

from baseline import robust_matrix, run
from make_data import generate

R = run()


def test_generator_is_deterministic():
    assert generate(n=1500, seed=3).equals(generate(n=1500, seed=3))


def test_an_unscaled_distance_is_really_one_feature():
    assert R["robust_scaled_ari_at_true_k"] > R["unscaled_ari"] + 0.15


def test_k_is_a_decision_not_a_statistic():
    # the silhouette alone merges overlapping segments: scoring at the planted k recovers more of the truth
    assert 3 <= R["chosen_k"] <= 9
    assert R["robust_scaled_ari_at_true_k"] >= R["robust_scaled_ari_at_chosen_k"] or R["chosen_k"] == R["true_segments"]


def test_unconstrained_k_selection_can_spend_a_cluster_on_outliers():
    assert R["unconstrained_k_smallest_share"] <= R["smallest_segment_share"]


def test_segmentation_is_stable_under_resampling():
    assert R["bootstrap_stability_ari"] > 0.6


def test_no_segment_is_a_sliver():
    assert R["smallest_segment_share"] > 0.02


def test_winsorising_bounds_outliers():
    Z = robust_matrix(generate(n=1500, seed=1))
    assert Z.max() <= 6 and Z.min() >= -6


def test_the_segment_mix_shifts_in_the_last_period():
    assert R["segment_mix_shift_js"] > 0.005
