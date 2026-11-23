"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('feedback beats an open-loop schedule', lambda r: r["pid"]["tracking_rmse_pct"] < r["open_loop"]["tracking_rmse_pct"]),
    ('aggressive gains make the controller jitter more', lambda r: r["pid_aggressive_gains"]["oscillation"] > r["pid"]["oscillation"]),
]
