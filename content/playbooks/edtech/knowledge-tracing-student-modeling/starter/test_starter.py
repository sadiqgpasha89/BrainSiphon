"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pandas as pd
import pytest

from baseline import run, split_students, student_leakage_demo
from features import FEATURES, LearnerState, item_logits, replay
from make_data import generate


@pytest.fixture(scope="module")
def small():
    return generate(n_students=60, n_skills=6, n_questions=60, mean_len=40, seed=21)


def test_generator_is_deterministic_and_correctness_is_plausible(small):
    assert small.equals(generate(n_students=60, n_skills=6, n_questions=60, mean_len=40, seed=21))
    assert 0.4 < small.correct.mean() < 0.85


def test_state_is_read_before_the_answer_is_applied():
    s = LearnerState()
    first = s.read(skill=2, ts=0.0, item_logit=0.0)
    assert first[:4] == [0, 0, 0, 0.5]                               # n, correct, wrong, ewma: nothing known yet
    s.update(2, 0.0, 1)
    second = s.read(2, 5.0, 0.0)
    assert second[:3] == [1, 1, 0] and second[5] == 5.0                # one right answer, 5 hours since practice


def test_features_depend_on_timestamps_not_on_row_order(small):
    logits = item_logits(small)
    a = replay(small, logits)
    b = replay(small.sample(frac=1.0, random_state=3), logits)
    assert np.allclose(a[FEATURES].to_numpy(), b[FEATURES].to_numpy())


def test_train_and_test_students_are_disjoint(small):
    a, b = split_students(small)
    assert not a & b and a | b == set(small.student.unique())


@pytest.fixture(scope="module")
def report():
    return run(seed=21)


def test_tracer_beats_the_pfa_baseline_and_is_calibrated(report):
    pfa, gb = report["pfa_logistic"], report["gbdt_tracer"]
    assert gb["auc"] >= pfa["auc"] + 0.01 and gb["auc"] >= 0.60, report     # M4 gate
    assert gb["ece"] <= 0.03 and pfa["ece"] <= 0.03, report                  # mastery must read as a probability
    assert gb["auc"] < report["oracle_auc"], report                          # sanity: cannot beat the truth


def test_a_raw_running_accuracy_is_not_a_calibrated_mastery_estimate(report):
    assert report["skill_running_accuracy"]["ece"] > 0.08, report
    assert report["pfa_logistic"]["auc"] > report["skill_running_accuracy"]["auc"] + 0.03, report


def test_student_id_encoding_wins_on_random_splits_and_fails_on_new_students(report):
    r = student_leakage_demo()
    assert r["random_row_split"] - r["student_split"] >= 0.05, r
    assert r["student_split"] < report["pfa_logistic"]["auc"], (r, report)
