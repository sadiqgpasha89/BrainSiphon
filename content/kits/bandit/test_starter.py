"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pytest

from baseline import estimators, fit_reward_models, run
from make_data import K, log_data, true_value


def test_generator_is_deterministic_and_logs_propensities_that_sum_to_one():
    a, _ = log_data(n=500)
    b, _ = log_data(n=500)
    assert np.array_equal(a["a"], b["a"]) and np.allclose(a["all_propensities"].sum(axis=1), 1.0)
    assert (a["propensity"] > 0).all()


def test_ips_is_unbiased_when_the_logger_is_uniformly_random():
    log, w = log_data(n=60_000, logging_temperature=1e6)                       # ~uniform logging
    models = fit_reward_models(log["x"], log["a"], log["r"])
    policy = lambda x: np.zeros(len(x), dtype=int)                              # noqa: E731
    est = estimators(log, policy(log["x"]), models, clip=1e-9)
    assert est["ips"] == pytest.approx(true_value(w, policy), abs=0.02)


def test_matching_rows_only_is_biased_when_the_logger_is_biased():
    log, w = log_data(n=60_000)
    models = fit_reward_models(log["x"], log["a"], log["r"])
    policy = lambda x: np.zeros(len(x), dtype=int)                              # noqa: E731
    est = estimators(log, policy(log["x"]), models)
    truth = true_value(w, policy)
    assert abs(est["naive_matched"] - truth) > abs(est["snips"] - truth) + 0.02


@pytest.fixture(scope="module")
def report():
    return run(seed=83)


def test_the_learned_policy_really_is_better_than_the_best_constant_action(report):
    assert report["learned_greedy"]["true_value"] >= report["always_best_average_action"]["true_value"] + 0.2, report


def test_offline_estimators_rank_correctly_and_doubly_robust_is_closest_to_the_truth(report):
    for name in ("always_best_average_action", "learned_greedy"):
        r = report[name]
        assert abs(r["doubly_robust"] - r["true_value"]) <= 0.03, report
        assert abs(r["naive_matched"] - r["true_value"]) > abs(r["doubly_robust"] - r["true_value"]), report
    assert report["learned_greedy"]["doubly_robust"] > report["always_best_average_action"]["doubly_robust"] + 0.15, report
