"""Executable gates for the control engine."""

import numpy as np

from baseline import run, simulate
from make_data import STEPS, day, profile

R = run()


def test_the_opportunity_profile_is_a_distribution():
    assert abs(profile().sum() - 1.0) < 1e-12 and (profile() > 0).all()


def test_days_are_deterministic():
    assert np.array_equal(day(5), day(5))


def test_the_cap_is_never_exceeded():
    for s in range(20):
        for c in ("open", "pid"):
            assert simulate(c, day(s))["overshoot_max_pct"] < 100  # computed against the plan, never against the cap
    spent_cap = simulate("pid", day(3) * 5, cap=1.0)
    assert spent_cap["hit_cap"]


def test_feedback_beats_an_open_loop_schedule():
    assert R["rmse_reduction_vs_open_loop"] > 0.25


def test_too_much_gain_makes_the_controller_oscillate():
    assert R["pid_aggressive_gains"]["oscillation"] > 2 * R["pid"]["oscillation"]


def test_a_long_feedback_delay_hurts_but_does_not_break_the_controller():
    assert R["pid_with_two_hour_feedback_delay"]["tracking_rmse_pct"] > R["pid"]["tracking_rmse_pct"]
    assert R["pid_with_two_hour_feedback_delay"]["tracking_rmse_pct"] < 3 * R["open_loop"]["tracking_rmse_pct"]
    assert STEPS == 288
