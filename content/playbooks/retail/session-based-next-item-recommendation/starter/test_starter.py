"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pytest

from baseline import (TEST_START, TRAIN_END, Models, bot_filter, data, evaluate, leakage_demo, run, sessions_of)
from make_data import generate


@pytest.fixture(scope="module")
def small():
    return generate(n_sessions=3000, n_items=300, seed=9)


def test_generator_is_deterministic_and_contains_bots(small):
    assert small.equals(generate(n_sessions=3000, n_items=300, seed=9))
    assert 0.05 < small.groupby("session").is_bot.first().mean() < 0.15


def test_time_split_has_a_gap_and_no_shared_session():
    df = data(9)
    tr, te = df[df.day < TRAIN_END], df[df.day >= TEST_START]
    assert tr.day.max() < TEST_START and not set(tr.session) & set(te.session)


def test_bot_filter_catches_crawlers_and_keeps_humans(small):
    kept = set(bot_filter(small).session)
    s = small.groupby("session").is_bot.first()
    assert np.mean([i not in kept for i in s[s == 1].index]) > 0.95        # crawlers removed
    assert np.mean([i in kept for i in s[s == 0].index]) > 0.98            # humans kept


def test_evaluation_never_credits_a_repeat_of_what_the_user_just_saw():
    m = Models([np.array([0, 1, 2]), np.array([0, 1, 2])], 3, np.zeros(3, dtype=int))
    echo = lambda prefix: np.eye(3)[prefix[-1]] * 1e6          # recommends the item just viewed
    r = evaluate(echo, [np.array([0, 1, 1])], 3)                # the 'next' item equals the last one
    assert r["hit_rate@20"] == 0.0


@pytest.fixture(scope="module")
def report():
    return run(seed=9)


def test_order_matters_and_everything_beats_popularity(report):
    assert report["ordered_transition"]["mrr@20"] > report["bag_covisit"]["mrr@20"] + 0.04, report
    assert report["bag_covisit"]["hit_rate@20"] >= 5 * report["popularity"]["hit_rate@20"], report


def test_theme_aware_challenger_does_not_regress(report):
    o, t = report["ordered_transition"], report["theme_aware"]
    assert t["hit_rate@20"] >= o["hit_rate@20"] - 0.005 and t["mrr@20"] >= o["mrr@20"] - 0.005, report
    assert report["theme_aware"]["coverage"] > 0.5                       # not a popularity machine


def test_leaving_bots_in_training_hurts_ranking_quality():
    clean, dirty = run(seed=9)["theme_aware"], run(seed=9, filter_bots=False)["theme_aware"]
    assert dirty["mrr@20"] < 0.9 * clean["mrr@20"], (clean, dirty)


def test_random_session_splits_flatter_the_popularity_baseline():
    r = leakage_demo()
    assert r["random_split"]["popularity"] > 1.1 * r["time_split"]["popularity"], r
