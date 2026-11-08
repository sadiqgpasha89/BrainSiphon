"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pytest

from baseline import REFRACTORY_H, alerts, evaluate, naive_z, run, seasonal_z
from make_data import HOURS_PER_WEEK, generate


def test_generator_is_deterministic_and_has_both_traps():
    a, ya, ca, ea = generate(n_series=10, weeks=8)
    b, yb, cb, eb = generate(n_series=10, weeks=8)
    assert np.array_equal(a, b) and ea == eb
    assert 0.005 < ya.mean() < 0.08 and ca.mean() > 0.01        # anomalies are rare; benign calendar events exist


@pytest.mark.parametrize("fn", [naive_z, seasonal_z])
def test_scores_use_only_the_past(fn):
    x = generate(n_series=1, weeks=8)[0][0]
    cut = 6 * HOURS_PER_WEEK
    y = x.copy()
    y[cut:] += 1e6                                                # corrupt the future
    assert np.allclose(fn(x)[:cut], fn(y)[:cut])


def test_alert_policy_respects_the_refractory_period():
    z = np.zeros((1, 100)); z[0, [10, 11, 12, 30, 31]] = 9.0
    got = alerts(z, 5.0)[0]
    assert got == [10, 30] and all(b - a >= REFRACTORY_H for a, b in zip(got, got[1:]))


def test_evaluation_counts_late_detection_delay_and_false_alerts():
    z = np.zeros((1, 200)); z[0, 52] = 9.0; z[0, 150] = 9.0       # one alert inside the event, one far away
    labels = np.zeros((1, 200), dtype=int); labels[0, 50:60] = 1
    r = evaluate(z, labels, [(0, 50, 60, "shift")], 0, 200, 5.0)
    assert r["recall"] == 1.0 and r["median_delay_h"] == 2.0
    assert r["false_alerts_per_series_week"] == pytest.approx(1 / (200 / HOURS_PER_WEEK))


@pytest.fixture(scope="module")
def report():
    return run(seed=41)


def test_a_seasonal_baseline_finds_far_more_events_than_a_rolling_z_score(report):
    assert report["seasonal_z_calendar"]["recall"] >= report["naive_z"]["recall"] + 0.30, report


def test_known_calendar_events_buy_recall_at_the_same_alert_budget(report):
    plain, cal = report["seasonal_z"], report["seasonal_z_calendar"]
    assert cal["false_alerts_per_series_week"] <= 0.6, report                     # budget respected on held-out time
    assert cal["false_alerts_per_series_week"] <= plain["false_alerts_per_series_week"], report
    assert cal["recall"] >= plain["recall"], report
