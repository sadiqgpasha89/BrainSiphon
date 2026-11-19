# Agentic workflow reference implementation. `make help` lists the targets.
SHELL := /bin/bash
PY ?= .venv/bin/python
export PYTHONPATH := .:src
-include .env
export

.PHONY: help setup seed ingest evaluate serve worker verify monitor advance reevaluate demo test lint rules clean
help:      ## Show this help
	@grep -E '^[a-z-]+: .*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-9s %s\n", $$1, $$2}'
setup:     ## Create .venv, install pinned dependencies, generate .env (secrets and demo passwords)
	python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt && $(PY) -m bsref.setup
seed:      ## Seed the simulated security stack (24 past incidents, 6 live alerts)
	$(PY) -m data.source_system seed
ingest:    ## Run CDC relay + case ingestion once, then the agent investigates new cases
	$(PY) -m data.worker
evaluate:  ## Evaluate the agent configuration on the labelled incidents, register, promote if the gates pass
	$(PY) -m training.train
serve:     ## Start the API and analyst console on $$API_PORT (default 8000)
	$(PY) -m uvicorn api.app:app --host 127.0.0.1 --port $${API_PORT:-8000}
worker:    ## Run the CDC + ingestion + investigation worker continuously
	$(PY) -m data.worker --loop
verify:    ## Verify a running API end to end (traces, approvals, four-eyes, verdicts)
	$(PY) scripts/verify.py
monitor:   ## Run the monitoring job (overrides, missed threats, tool errors, alerts)
	$(PY) -m monitoring.job
advance:   ## Six more live alerts arrive
	$(PY) -m data.source_system advance
reevaluate:   ## Re-evaluate the agent if a trigger fires (add ARGS=--force to re-evaluate regardless)
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
