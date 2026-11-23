"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pytest

from baseline import split, run, wmape
from features import FEATURES, build_table, origin_rows, series_arrays
from make_data import generate


@pytest.fixture(scope="module")
def small():
    return generate(n_series=20, days=240, seed=3)


def test_generator_is_deterministic_and_has_the_leading_indicator(small):
    assert small.equals(generate(n_series=20, days=240, seed=3))
    assert (small.constrained == 1).mean() > 0.01                       # censored demand exists
    assert small.prebooked_1.corr(small.true_demand.shift(-1)) > 0.5   # the order book leads demand


def test_wmape_definition():
    assert wmape(np.array([10.0, 10.0]), np.array([8.0, 12.0])) == pytest.approx(0.2)


def test_training_targets_precede_validation_origins():
    tr, va, te = split(build_table(generate(n_series=6, days=730, seed=3)))
    assert (tr.t + tr.h).max() < va.t.min() <= va.t.max() < te.t.min()


def test_features_ignore_everything_after_the_origin(small):
    g = small[small.sid == 3].sort_values("day")
    a = series_arrays(g)
    b = series_arrays(g)
    b["sales"][121:] = 1e6                              # corrupt the future of the sales history only
    t = 120
    ra = origin_rows(a, [t])
    rb = origin_rows(b, [t])
    for x, y in zip(ra, rb):
        for k in FEATURES:
            assert x[k] == y[k] or (np.isnan(x[k]) and np.isnan(y[k])), f"feature {k} read the future"


def test_a_late_pos_day_is_missing_not_zero(small):
    a = series_arrays(small[small.sid == 3].sort_values("day"))
    nan_row = origin_rows(a, [100], horizons=(1,), late_feed=True, zero_fill=False)[0]
    zero_row = origin_rows(a, [100], horizons=(1,), late_feed=True, zero_fill=True)[0]
    assert nan_row["missing_7"] == 1 and zero_row["missing_7"] == 0
    assert nan_row["mean_7"] > zero_row["mean_7"]                       # zero-fill reads a feed gap as a demand collapse


@pytest.fixture(scope="module")
def report():
    return run(seed=3)


def test_model_adds_value_over_the_seasonal_baseline_at_every_horizon(report):
    for h in (1, 3, 7, 14):
        assert report[f"h{h}"]["fva"] >= 0.25, (h, report)               # M3/M4 gate: forecast value added
    assert 0.85 <= report["p90_coverage"] <= 0.95, report                 # the P90 band means what it says


def test_aggregate_accuracy_hides_sku_level_error(report):
    assert report["wmape_aggregate"] < 0.5 * report["wmape_sku_level"], report


def test_zero_filling_a_late_feed_hurts_more_than_leaving_it_missing(report):
    lf = report["late_feed"]
    assert lf["missing_as_nan"] < 0.85 * lf["missing_as_zero"], report
