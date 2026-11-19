"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import numpy as np
import pytest

from baseline import greedy, optimal, run, total
from make_data import generate


def test_generator_is_deterministic_and_predictions_are_noisy():
    a, b = generate(n_instances=5, n=10), generate(n_instances=5, n=10)
    assert all(np.array_equal(x, y) for x, y in zip(a, b))
    true, pred, _ = generate()
    assert 0.1 < np.median(np.abs(np.log(pred / true))) < 0.5


def test_assignments_are_permutations_and_the_optimiser_never_loses_to_greedy_on_what_it_is_given():
    rng = np.random.default_rng(0)
    for _ in range(20):
        c = rng.lognormal(2, 0.5, (12, 12))
        g, o = greedy(c), optimal(c)
        assert sorted(g) == list(range(12)) and sorted(o) == list(range(12))
        assert total(c, o) <= total(c, g) + 1e-9


def test_optimal_assignment_on_a_known_example():
    c = np.array([[1.0, 4.0, 5.0], [2.0, 2.0, 4.0], [3.0, 6.0, 1.0]])
    assert list(optimal(c)) == [0, 1, 2] and total(c, optimal(c)) == 4.0


@pytest.fixture(scope="module")
def report():
    return run(seed=97)


def test_optimising_noisy_predictions_promises_more_than_it_delivers(report):
    assert report["optimal_on_predictions"]["optimism_gap_pct"] >= 30, report
    assert abs(report["oracle_true_costs"]["optimism_gap_pct"]) < 10, report      # with true costs the promise is honest


def test_an_uncertainty_penalty_cuts_regret_and_the_optimiser_beats_greedy(report):
    greedy_r, opt_r = report["greedy_on_predictions"]["regret_vs_oracle_pct"], report["optimal_on_predictions"]["regret_vs_oracle_pct"]
    pen_r = report["optimal_with_uncertainty_penalty"]["regret_vs_oracle_pct"]
    assert opt_r < greedy_r - 5 and pen_r < opt_r - 3, report
