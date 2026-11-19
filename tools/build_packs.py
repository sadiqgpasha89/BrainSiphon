"""Generate every worked-template pack from data/blueprints.json.gz and the engines.

    python3 tools/build_packs.py                 # all 500
    python3 tools/build_packs.py fintech         # one domain
    python3 tools/build_packs.py fintech/real-time-card-upi-fraud-detection

Writes docs, contracts, deployment files and the starter (engine code plus this use case's configuration). It does not run the
starters: `tools/run_packs.py` does that and writes results.json, and `tools/render_results.py` then writes WORKED_EXAMPLE.md,
README.md and manifest.json from those real results.
"""

from __future__ import annotations

import gzip
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from packgen import contracts, docs  # noqa: E402
from packgen.engines import ROOT, engine_meta, knobs_for, pick_engine, seed_for  # noqa: E402
from packgen.md import get  # noqa: E402

SKIP = {"kit.json", "__pycache__", "report.json", ".pytest_cache"}

RUN_USECASE = '''"""Runs this use case's worked example on synthetic data and writes results.json.

    python run_usecase.py
"""

from __future__ import annotations

import json
import pathlib
import platform
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
CFG = json.loads((HERE / "usecase.json").read_text())


def versions() -> dict:
    out = {"python": platform.python_version()}
    for name in ("numpy", "pandas", "sklearn", "scipy"):
        try:
            out[name] = __import__(name).__version__
        except Exception:  # the engine may not need every library
            pass
    return out


def run_example() -> dict:
    import baseline

    kwargs = dict(CFG["knobs"])
    if CFG["seed"] is not None:
        kwargs["seed"] = CFG["seed"]
    start = time.time()
    results = baseline.run(**kwargs)
    return {
        "use_case": CFG["slug"],
        "engine": CFG["engine"],
        "seed": CFG["seed"],
        "knobs": CFG["knobs"],
        "libraries": versions(),
        "seconds": round(time.time() - start, 1),
        "results": results,
    }


def _plain(o):
    return o.item() if hasattr(o, "item") else str(o)


def main() -> None:
    out = run_example()
    (HERE / "results.json").write_text(json.dumps(out, indent=1, default=_plain) + "\\n")
    print(json.dumps(out["results"], indent=1, default=_plain)[:6000])


if __name__ == "__main__":
    main()
'''

TEST_USECASE = '''"""Gates for this use case's worked example: its results file must be reproducible, and every gate for the engine must hold."""

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
'''

MAKEFILE = """PY ?= python3
VENV = .venv

.PHONY: setup demo test clean

setup:
\t$(PY) -m venv $(VENV)
\t$(VENV)/bin/pip install -r requirements.txt

demo:
\t$(if $(wildcard $(VENV)/bin/python),$(VENV)/bin/python,$(PY)) run_usecase.py

test:
\t$(if $(wildcard $(VENV)/bin/python),$(VENV)/bin/python,$(PY)) -m pytest -q

clean:
\trm -rf $(VENV) __pycache__ .pytest_cache
"""


def signals(u: dict) -> list[dict]:
    return [{"name": f.get("name"), "definition": f.get("formulaOrLogic"), "asOfRule": f.get("leakageRisk")} for f in get(u, "dataAndFeatures.highSignalFeatures", [])]


def build(u: dict) -> dict:
    domain, key = u["slug"].split("/")
    pack = ROOT / "templates" / domain / key
    saved = (pack / "starter" / "results.json").read_bytes() if KEEP_RESULTS and (pack / "starter" / "results.json").exists() else None
    if pack.exists():
        shutil.rmtree(pack)
    (pack / "docs").mkdir(parents=True)
    (pack / "contracts").mkdir()
    (pack / "deployment").mkdir()
    starter = pack / "starter"
    starter.mkdir()

    authored_dir = ROOT / "vendor" / "authored-starters" / domain / key / "starter"
    authored = authored_dir.exists()
    compat = get(u, "playbook.compatibility", {}) or {}
    if authored:
        engine, fit = "authored", "authored"
        meta = {"id": "authored", "label": "Hand-written starter for this use case", "summary": "A starter written for this use case, with its own data generator, tests, contracts and serving layer.", "traps": [], "slots": []}
        shutil.copytree(authored_dir, starter, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "report.json", "*.csv"))
        seed, knobs = None, {}
    else:
        engine, fit = pick_engine(compat.get("problemType", ""))
        if compat.get("kitId") == engine and compat.get("verdict") in ("exact", "adaptable"):
            fit = compat["verdict"]
        meta = engine_meta(engine)
        for f in (ROOT / "engines" / engine).iterdir():
            if f.name in SKIP:
                continue
            shutil.copy(f, starter / f.name)
        seed, knobs = seed_for(u["slug"]), knobs_for(u["slug"], engine)
    if saved is not None:
        (starter / "results.json").write_bytes(saved)
    (starter / "Makefile").write_text(MAKEFILE)
    (starter / "run_usecase.py").write_text(RUN_USECASE)
    (starter / "test_usecase.py").write_text(TEST_USECASE)
    if not (starter / "Dockerfile").exists():
        (starter / "Dockerfile").write_text(contracts.DOCKERFILE)
    if not (starter / "requirements.txt").exists():
        shutil.copy(ROOT / "engines" / "regression" / "requirements.txt", starter / "requirements.txt")

    cfg = {
        "slug": u["slug"],
        "title": u["title"],
        "domain": domain,
        "engine": engine,
        "fit": fit,
        "problemType": compat.get("problemType", ""),
        "seed": seed,
        "knobs": knobs,
        "blueprintSignals": signals(u),
        "engineFeatures": meta.get("slots", []),
        "label": docs.label_text(u),
    }
    (starter / "usecase.json").write_text(json.dumps(cfg, indent=1, ensure_ascii=False) + "\n")

    d = pack / "docs"
    (d / "00-use-case-brief.md").write_text(docs.brief(u))
    (d / "01-discovery-workbook.md").write_text(docs.discovery(u))
    (d / "02-delivery-plan.md").write_text(docs.delivery_plan(u))
    (d / "03-data-and-features.md").write_text(docs.data_and_features(u))
    (d / "04-evaluation-plan.md").write_text(docs.evaluation(u))
    (d / "05-risk-and-governance.md").write_text(docs.governance(u))
    (d / "06-operations-runbook.md").write_text(docs.operations(u))
    (d / "07-model-and-data-cards.md").write_text(docs.cards(u))
    (d / "08-capacity-and-cost.md").write_text(docs.capacity(u))
    fit_text = docs.fit_doc(u, engine, fit, meta, authored) if not (compat.get("kitId") != engine and not authored and fit == "adaptable") else docs.fit_doc({**u, "playbook": {**u["playbook"], "compatibility": {**compat, "dimensions": [], "modifications": []}}}, engine, fit, meta, authored)
    if not authored and compat.get("kitId") != engine:  # the stored comparison was made against a different engine: do not show it
        fit_text = docs.fit_doc({**u, "playbook": {**u["playbook"], "compatibility": {**compat, "dimensions": [], "modifications": []}}}, engine, fit, meta, authored)
    (pack / "FIT.md").write_text(fit_text)

    c = pack / "contracts"
    (c / "openapi.yaml").write_text(contracts.openapi(u))
    (c / "events.asyncapi.yaml").write_text(contracts.asyncapi(u))
    (c / "data-contract.yaml").write_text(contracts.data_contract(u))
    (c / "schema.sql").write_text(contracts.schema_sql(u))
    dp = pack / "deployment"
    (dp / "config.yaml").write_text(contracts.config_yaml(u))
    (dp / "values.sized.yaml").write_text(contracts.helm_values(u))
    (dp / "docker-compose.yml").write_text(contracts.compose(u))
    (dp / "README.md").write_text(contracts.deployment_readme(u))

    # the customer implementation pack from the FDE track, where one exists for this use case
    fde = ROOT / "fde-packs" / domain / key
    return {"slug": u["slug"], "engine": engine, "fit": fit, "authored": authored, "fdePack": fde.exists(), "path": str(pack.relative_to(ROOT))}


KEEP_RESULTS = "--keep-results" in sys.argv


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only = args[0] if args else ""
    with gzip.open(ROOT / "data" / "blueprints.json.gz", "rt", encoding="utf-8") as fh:
        records = json.load(fh)
    built = [build(u) for u in records if not only or u["slug"] == only or u["slug"].startswith(only + "/")]
    (ROOT / "data" / "build-index.json").write_text(json.dumps(built, indent=1) + "\n") if not only else None
    print(f"built {len(built)} packs")


if __name__ == "__main__":
    main()
