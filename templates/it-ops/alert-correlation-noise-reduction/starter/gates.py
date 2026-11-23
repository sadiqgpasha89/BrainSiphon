"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('weighted matching beats a shared-value rule on precision', lambda r: r["weighted_pair_model"]["pair_precision"] > r["any_shared_value"]["pair_precision"]),
    ('clusters are pure', lambda r: r["weighted_pair_model"]["purity"] > 0.9),
]
