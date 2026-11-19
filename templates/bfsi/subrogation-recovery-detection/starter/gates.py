"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('a random split with a leak overstates macro-F1', lambda r: r["random_split_with_leak"]["macro_f1"] > r["time_split_clean"]["macro_f1"]),
    ('a frozen model degrades on later months', lambda r: r["frozen_model_months_6_7"]["macro_f1"] <= r["frozen_model_next_month"]["macro_f1"] + 0.01),
]
