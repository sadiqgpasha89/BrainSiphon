"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('the better generator is not detected as worse', lambda r: r["v2_minus_v1"] > 0),
    ('the judges are not interchangeable', lambda r: r["judge_agreement_kappa_v1"] < 1.0),
    ('a small golden set gives a wider interval', lambda r: r["ci_width_at_60_items"] > r["ci_width_at_full_set"]),
]
