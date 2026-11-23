"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('challenger earns its place on MAE', lambda r: r["mae_gain_vs_baseline"] > 0.05),
    ('a leaky feature would look far better than the honest model', lambda r: r["leaky_feature_rmse"] < 0.6 * r["honest_rmse"]),
    ('interval coverage is in a sane range', lambda r: 0.5 <= r["interval_80_coverage"] <= 0.95),
    ('a global error hides a worse segment', lambda r: r["worst_segment_vs_overall"] > 1.0),
]
