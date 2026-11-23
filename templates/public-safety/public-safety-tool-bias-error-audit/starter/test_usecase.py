"""Gates for this use case's worked example: its results file must be reproducible, and every gate for the engine must hold."""

from __future__ import annotations

import json
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import run_usecase  # noqa: E402

try:
    from gates import GATES  # noqa: E402
except ImportError:  # hand-written starters carry their own tests instead
    GATES = []

CFG = json.loads((HERE / "usecase.json").read_text())
SAVED = json.loads((HERE / "results.json").read_text())


def close(a, b, tol=1e-6) -> bool:
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(close(a[k], b[k], tol) for k in a)
    if isinstance(a, (list, tuple)):
        return len(a) == len(b) and all(close(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float):
        return abs(float(a) - float(b)) <= tol * max(1.0, abs(float(a)))
    return a == b


def test_saved_results_are_reproduced_by_a_fresh_run():
    fresh = json.loads(json.dumps(run_usecase.run_example()["results"], default=run_usecase._plain))  # same form as the saved file
    assert close(fresh, SAVED["results"])


@pytest.mark.parametrize("name,check", GATES or [("no engine gates for a hand-written starter", lambda r: True)])
def test_engine_gate(name, check):
    assert check(SAVED["results"]), name


def test_usecase_configuration_is_complete():
    for key in ("slug", "title", "engine", "fit", "problemType", "knobs", "blueprintSignals", "engineFeatures"):
        assert key in CFG
    assert CFG["blueprintSignals"], "the blueprint lists the signals to map onto the starter features"
