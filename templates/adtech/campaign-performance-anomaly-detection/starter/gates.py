"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('calendar-aware scoring finds at least what the naive score finds', lambda r: r["seasonal_z_calendar"]["recall"] >= r["naive_z"]["recall"]),
    ('calendar-aware recall is useful', lambda r: r["seasonal_z_calendar"]["recall"] > 0.5),
]
