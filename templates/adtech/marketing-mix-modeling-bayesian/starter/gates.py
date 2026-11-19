"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('weighting reduces the bias of the naive comparison', lambda r: abs(r["ipw_bias"]) < abs(r["naive_bias"])),
    ('the naive comparison is biased upward', lambda r: r["naive_bias"] > 0.02),
    ('the uplift ranking beats random targeting', lambda r: r["t_learner_qini_auc"] > r["random_ranking_qini_auc"]),
]
