"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pandas as pd
import pytest

from baseline import BURDEN_PER_100_PD, run, split_patients
from features import FEATURES, patient_features
from make_data import generate


@pytest.fixture(scope="module")
def raw():
    return generate(seed=11)


def test_generator_is_deterministic_and_has_a_realistic_prevalence(raw):
    assert raw.equals(generate(seed=11))
    stays = raw.groupby("pid").sepsis.first()
    assert 0.05 < stays.mean() < 0.14


def test_train_valid_test_share_no_patient(raw):
    a, b, c = split_patients(raw)
    assert not (a & b) and not (a & c) and not (b & c)


def test_leaky_columns_are_not_features():
    banned = {"abx_ordered", "onset_hour", "sepsis", "y_next6h", "censored", "lactate_result_hour", "lactate_value"}
    assert not banned & set(FEATURES)


def test_features_use_only_the_past(raw):
    for pid in (3, 17, 42, 101, 230):
        g = raw[raw.pid == pid]
        cut = 30
        full = patient_features(g).set_index("hour").loc[: cut, FEATURES]
        past = patient_features(g[g.hour <= cut]).set_index("hour")[FEATURES]
        assert np.allclose(full.to_numpy(), past.to_numpy(), equal_nan=True), f"patient {pid} leaks the future"


def test_lactate_appears_only_after_its_result_hour():
    h = np.arange(10)
    g = pd.DataFrame({"pid": 0, "hour": h, "hr": 80.0, "sbp": 120.0, "rr": 16.0, "temp": 37.0, "spo2": 97.0,
                      "lactate_value": np.nan, "lactate_result_hour": np.nan})
    g.loc[5, ["lactate_value", "lactate_result_hour"]] = [4.2, 7]          # drawn at 5, resulted at 7
    f = patient_features(g).set_index("hour")
    assert f.lactate.loc[:6].isna().all() and (f.lactate.loc[7:] == 4.2).all()


@pytest.fixture(scope="module")
def report():
    return run(seed=11)


def test_model_beats_the_fixed_threshold_score_at_the_same_alert_burden(report):
    m, g = report["mews_like"], report["gbdt"]
    assert m["alerts_per_100_patient_days"] <= BURDEN_PER_100_PD + 1.0
    assert g["alerts_per_100_patient_days"] <= BURDEN_PER_100_PD + 1.0          # M3/M4 gate: burden respected
    assert g["sensitivity"] >= m["sensitivity"] + 0.10, report                   # and it finds more sepsis
    assert g["median_lead_time_h"] >= m["median_lead_time_h"], report            # and earlier
