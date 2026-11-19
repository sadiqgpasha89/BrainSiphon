"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('the new site is harder than the held-out images of the training site', lambda r: r["pixels_lr"]["site_A_heldout"]["auc"] > r["pixels_lr"]["site_B"]["auc"]),
    ('the training-site threshold misfires on the new site', lambda r: r["pixels_lr"]["site_B_at_A_threshold"]["false_positive_rate"] > 0.2),
]
