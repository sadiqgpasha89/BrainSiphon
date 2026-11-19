"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('model beats the seasonal baseline at 7 days', lambda r: r["h7"]["wmape_model"] < r["h7"]["wmape_baseline"]),
    ('forecast value added is positive', lambda r: r["h7"]["fva"] > 0.05),
    ('90th-percentile band coverage', lambda r: 0.7 < r["p90_coverage"] < 0.98),
]
