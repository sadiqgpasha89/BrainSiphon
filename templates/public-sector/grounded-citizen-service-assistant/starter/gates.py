"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('the guarded pipeline hallucinates no more than the naive one', lambda r: r["guarded"]["hallucination_rate"] <= r["naive"]["hallucination_rate"]),
    ('answered precision does not fall', lambda r: r["guarded"]["answered_precision"] >= r["naive"]["answered_precision"]),
]
