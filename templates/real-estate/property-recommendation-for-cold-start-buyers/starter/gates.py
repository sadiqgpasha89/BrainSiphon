"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('session-aware model beats popularity', lambda r: r["theme_aware"]["hit_rate@20"] > 2 * r["popularity"]["hit_rate@20"]),
    ('order helps or at least does not hurt', lambda r: r["ordered_transition"]["hit_rate@20"] >= 0.95 * r["bag_covisit"]["hit_rate@20"]),
]
