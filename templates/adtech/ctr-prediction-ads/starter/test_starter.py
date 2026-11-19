"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pandas as pd
import pytest

from baseline import ne, run, split
from features import PRIOR_CTR, PRIOR_STRENGTH, build_features
from make_data import generate


@pytest.fixture(scope="module")
def small():
    return generate(n_impressions=20_000, n_ads=150, n_users=3000, seed=5)


def test_generator_is_deterministic_and_ctr_is_realistic(small):
    assert small.equals(generate(n_impressions=20_000, n_ads=150, n_users=3000, seed=5))
    assert 0.02 < small.click.mean() < 0.09


def test_time_split_is_chronological(small):
    tr, va, te = split(build_features(small))
    assert tr.ts.max() < va.ts.min() <= va.ts.max() < te.ts.min()


def test_history_uses_only_impressions_before_the_row(small):
    cut = small.ts.quantile(0.6)
    full = build_features(small).set_index("ts")
    past = build_features(small[small.ts <= cut]).set_index("ts")
    cols = ["ctr_ad", "ctr_ad_pl", "ctr_adv", "imps_ad"]
    assert np.allclose(full.loc[past.index, cols].to_numpy(), past[cols].to_numpy()), "history leaked the future"


def test_smoothed_history_excludes_the_current_click_and_mis_taps():
    t = pd.DataFrame({"ts": [1.0, 2.0, 3.0, 4.0], "ad": 7, "advertiser": 1, "placement": 0, "click": [1, 0, 1, 0],
                      "dwell_ms": [3000, 0, 100, 0], "user": 0, "seg": 0, "category": 0, "device": 0, "hour": 0,
                      "position": 1, "explore": 0, "true_p": 0.05})
    f = build_features(t)
    prior = PRIOR_CTR * PRIOR_STRENGTH
    expected = [prior / PRIOR_STRENGTH, (1 + prior) / (1 + PRIOR_STRENGTH), (1 + prior) / (2 + PRIOR_STRENGTH),
                (1 + prior) / (3 + PRIOR_STRENGTH)]  # the third click was a 100 ms mis-tap: it never enters history
    assert np.allclose(f.ctr_ad.to_numpy(), expected)


def test_ne_of_the_base_rate_predictor_is_one():
    y = np.array([0, 0, 0, 1, 0, 0, 1, 0, 0, 0])
    assert ne(y, np.full(len(y), y.mean())) == pytest.approx(1.0)


@pytest.fixture(scope="module")
def report():
    return run(seed=5)


def test_ignoring_position_biases_every_slot_and_position_awareness_fixes_it(report):
    bad, good = report["lr_no_position"], report["lr_hashed"]
    assert bad["bias_position_5"] > 1.4 and bad["bias_position_1"] < 0.85, report   # the trap is real
    assert 0.9 < good["bias_position_1"] < 1.1 and 0.9 < good["bias_position_5"] < 1.1, report


def test_baseline_beats_the_base_rate_and_challenger_earns_its_place(report):
    base, chal = report["lr_hashed"], report["gbdt"]
    assert base["ne"] < 0.95, report                       # M3 gate
    assert chal["ne"] <= base["ne"] + 0.005, report        # M4 gate: no regression ...
    assert chal["ece"] <= base["ece"], report              # ... and better calibrated after per-placement isotonic
