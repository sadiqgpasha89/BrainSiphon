PY ?= python3
VENV = .venv

.PHONY: setup demo test clean

setup:
	$(PY) -m venv $(VENV)
	$(VENV)/bin/pip install -r requirements.txt

demo:
	$(if $(wildcard $(VENV)/bin/python),$(VENV)/bin/python,$(PY)) run_usecase.py

test:
	$(if $(wildcard $(VENV)/bin/python),$(VENV)/bin/python,$(PY)) -m pytest -q

clean:
	rm -rf $(VENV) __pycache__ .pytest_cache
