"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import pandas as pd
import pytest

from baseline import ece, run, strip_leak
from make_data import generate


def test_generator_is_deterministic_with_duplicates_and_a_leak_token():
    a, b = generate(n_docs=1500), generate(n_docs=1500)
    assert a.equals(b)
    assert 0.15 < 1 - a.thread.nunique() / len(a) < 0.35
    assert 0.1 < a.text.str.contains("resolved_as_").mean() < 0.3


def test_the_post_hoc_token_is_removed_before_training():
    s = pd.Series(["ka ro resolved_as_3 tu", "mi le"])
    assert list(strip_leak(s)) == ["ka ro  tu", "mi le"]


def test_confidence_calibration_error_is_zero_when_confidence_matches_accuracy():
    import numpy as np
    y = np.array([0] * 10)
    p = np.tile([0.9, 0.1], (10, 1))
    assert ece(y, p) == pytest.approx(0.1)           # always right but only 90% confident


def test_a_time_split_keeps_every_thread_on_one_side():
    d = generate(n_docs=2000)
    early = d[d.month < 4]
    later = d[d.month >= 6]
    unseen = later[~later.thread.isin(set(early.thread))]
    assert not set(unseen.thread) & set(early.thread) and len(unseen) > 100


@pytest.fixture(scope="module")
def report():
    return run(seed=61)


def test_a_random_split_with_the_leak_token_overstates_quality(report):
    assert report["random_split_with_leak"]["macro_f1"] >= report["time_split_clean"]["macro_f1"] + 0.25, report


def test_a_frozen_model_degrades_when_new_vocabulary_appears(report):
    assert report["frozen_model_next_month"]["macro_f1"] >= report["frozen_model_months_6_7"]["macro_f1"] + 0.15, report
