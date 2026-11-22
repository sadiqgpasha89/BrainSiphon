"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('baseline clears chance', lambda r: r["baseline_lr"]["pr_auc"] > 4 * r["test_positive_rate"]),
    ('recall at 0.5% false positives', lambda r: r["baseline_lr"]["recall_at_0.5pct_fpr"] > 0.3),
    ('challenger earns its place', lambda r: r["challenger_hgb"]["pr_auc"] >= 0.8 * r["baseline_lr"]["pr_auc"]),
]
