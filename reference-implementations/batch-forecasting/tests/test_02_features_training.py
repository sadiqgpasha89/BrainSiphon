"""Origin-safe features, the rolling-origin backtest, gates and packaging."""

import numpy as np
import pandas as pd

from bsref import db, featurestore
from bsref.config import load_yaml, settings
from bsref.registry import Registry
from features.build import build, load_panel
from training import train

NAMES = featurestore.feature_names("demand_series_day")


def test_features_do_not_change_when_the_future_changes(world):
    """Leakage test: scramble every sale after the origin; the features at that origin must be identical."""
    with db.tx() as c:
        panel = load_panel(c, 14)
    origin = panel.last_observed - 30
    before = build(panel, origin, 14, NAMES)
    panel.units[:, origin + 1 :] = np.random.default_rng(0).integers(0, 999, size=panel.units[:, origin + 1 :].shape)
    panel.stockout[:, origin + 1 :] = True
    after = build(panel, origin, 14, NAMES)
    pd.testing.assert_frame_equal(before[NAMES + ["level", "baseline"]], after[NAMES + ["level", "baseline"]])


def test_stockout_days_are_excluded_from_the_level(world):
    with db.tx() as c:
        panel = load_panel(c, 14)
    origin = panel.last_observed - 20
    base = build(panel, origin, 14, NAMES).query("horizon == 1")["level"].to_numpy()
    panel.units[:, origin - 3] = 0.0
    panel.stockout[:, origin - 3] = True  # a recorded zero on a stock-out day is not zero demand
    marked = build(panel, origin, 14, NAMES).query("horizon == 1")["level"].to_numpy()
    panel.stockout[:, origin - 3] = False
    naive = build(panel, origin, 14, NAMES).query("horizon == 1")["level"].to_numpy()
    assert np.all(naive < marked) and np.allclose(marked, base, rtol=0.25)


def test_training_targets_never_reach_the_calibration_or_test_origins(world):
    cfg = load_yaml("configs/pipeline.yaml")
    with db.tx() as c:
        panel = load_panel(c, 14)
    tr, cal, te = train.origins_for(panel, cfg)
    assert max(tr) + cfg["horizon_days"] <= min(cal) < max(cal) < min(te)
    assert max(te) + cfg["horizon_days"] <= panel.last_observed


def test_first_model_beats_the_baseline_and_is_packaged_with_lineage(world):
    m = world["model"]
    assert m["promoted"] and m["failed_gates"] == []
    t = m["test_metrics"]
    assert t["wape"] < t["baseline_wape"] and t["forecast_value_added"] >= 0.05 and 0.65 <= t["coverage_p10_p90"] <= 0.92
    man = Registry(settings().registry_dir).manifest("demand-forecaster", m["version"])
    assert man["features"] == NAMES and man["sha256"] and man["extra"]["origins"]["test"][0] > man["extra"]["origins"]["train"][1]


def test_gates_reject_a_model_no_better_than_the_baseline_or_badly_calibrated():
    cfg = load_yaml("configs/pipeline.yaml")
    good = {"wape": 0.30, "forecast_value_added": 0.3, "coverage_p10_p90": 0.8}
    assert train.gate(good, 0.30, cfg) == []
    assert len(train.gate({**good, "forecast_value_added": 0.01}, None, cfg)) == 1
    assert len(train.gate({**good, "coverage_p10_p90": 0.5}, None, cfg)) == 1
    assert "regresses" in train.gate(good, 0.25, cfg)[0]
