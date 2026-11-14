# Run a target in every reference implementation:  make test | make demo | make lint | make sync
IMPLS := realtime-decisioning batch-forecasting rag-assistant agentic-workflow
PY ?= $(CURDIR)/.venv/bin/python

.PHONY: setup test demo lint sync check-sync
setup:       ## One shared virtual environment for all four (each also has its own `make setup`)
	python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt
	for d in $(IMPLS); do (cd $$d && PYTHONPATH=.:src $(PY) -m bsref.setup) || exit 1; done
test:        ## Platform tests, then every implementation's test suite
	cd _platform && $(PY) -m pytest -q
	for d in $(IMPLS); do echo "== $$d" && (cd $$d && PYTHONPATH=.:src $(PY) -m pytest -q) || exit 1; done
demo:        ## Every implementation's end-to-end demo, from a clean state
	for d in $(IMPLS); do echo "== $$d" && (cd $$d && rm -rf var models/registry && PYTHONPATH=.:src $(PY) scripts/demo.py | grep -E "PASS|FAIL|PASSED|FAILED") || exit 1; done
lint:
	for d in $(IMPLS); do (cd $$d && $(PY) -m ruff check .) || exit 1; done
	$(PY) -m ruff check _platform tools
sync:        ## Copy _platform/bsref into every implementation's src/bsref
	python3 tools/sync_platform.py
check-sync:
	python3 tools/sync_platform.py --check
