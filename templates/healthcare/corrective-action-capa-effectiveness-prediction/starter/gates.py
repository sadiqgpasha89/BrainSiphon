"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('counting censored subjects as non-events understates the rate', lambda r: r["count_all_rows_bias_vs_km"] < 0),
    ('the hazard model ranks better than chance', lambda r: r["c_index"] > 0.58),
    ('predicted risk is calibrated across deciles', lambda r: r["decile_calibration_mean_abs_gap"] < 0.08),
]
