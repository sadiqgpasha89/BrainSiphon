"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('scaling recovers more of the segments than raw distance', lambda r: r["robust_scaled_ari_at_true_k"] > r["unscaled_ari"]),
    ('segments are stable under resampling', lambda r: r["bootstrap_stability_ari"] > 0.5),
    ('no segment is a sliver', lambda r: r["smallest_segment_share"] > 0.01),
]
