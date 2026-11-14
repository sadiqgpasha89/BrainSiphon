# Real-time decisioning reference implementation. `make help` lists the targets.
SHELL := /bin/bash
PY ?= .venv/bin/python
export PYTHONPATH := .:src
-include .env
export

.PHONY: help setup seed ingest train serve worker verify monitor advance retrain demo test lint rules clean
help:      ## Show this help
	@grep -E '^[a-z-]+: .*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-9s %s\n", $$1, $$2}'
setup:     ## Create .venv, install pinned dependencies, generate .env (secrets and demo passwords)
	python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt && $(PY) -m bsref.setup
seed:      ## Seed the simulated source system (history up to now minus the held-back days)
	$(PY) -m data.source_system seed
ingest:    ## Run CDC relay + streaming ingestion once (drains everything pending)
	$(PY) -m data.worker
train:     ## Train, evaluate, register and promote if the gates pass
	$(PY) -m training.train
serve:     ## Start the API and analyst console on $$API_PORT (default 8000)
	$(PY) -m uvicorn api.app:app --host 127.0.0.1 --port $${API_PORT:-8000}
worker:    ## Run the CDC + ingestion worker continuously
	$(PY) -m data.worker --loop
verify:    ## Verify a running API end to end (decisions, authz, review queue, metrics)
	$(PY) scripts/verify.py
monitor:   ## Run the monitoring job (drift, delayed ground truth, alerts)
	$(PY) -m monitoring.job
advance:   ## Emit the held-back days from the source system (new traffic and chargebacks)
	$(PY) -m data.source_system advance
retrain:   ## Retrain if a trigger fires (add ARGS=--force to retrain regardless)
	$(PY) -m training.retrain $(ARGS)
demo:      ## Everything above, in order, with the API started and stopped for you
	$(PY) scripts/demo.py
test:      ## Unit, integration and end-to-end tests
	$(PY) -m pytest -q
lint:      ## Static checks
	$(PY) -m ruff check .
rules:     ## Regenerate monitoring/prometheus-rules.yml from monitoring/alerts.yaml
	$(PY) -m bsref.observability
clean:     ## Teardown: delete the local database, the model registry and logs (keeps .venv and .env)
	rm -rf var models/registry .pytest_cache
