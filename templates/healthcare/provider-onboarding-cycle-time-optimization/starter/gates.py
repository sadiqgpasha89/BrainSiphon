"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('an uncertainty penalty does not increase regret', lambda r: r["optimal_with_uncertainty_penalty"]["regret_vs_oracle_pct"] <= r["greedy_on_predictions"]["regret_vs_oracle_pct"]),
    ('optimising on predictions promises more than it delivers', lambda r: r["optimal_on_predictions"]["optimism_gap_pct"] > 0),
]
