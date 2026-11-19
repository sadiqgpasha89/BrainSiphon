"""The whole system, end to end, in one command:  python scripts/demo.py   (or `make demo`)

 1 seed the source system (ERP)        5 verify through the API: run, forecasts, authorisation, planner review
 2 CDC relay + ingestion               6 three weeks pass: actuals, restatements and late feeds arrive
 3 backtest, gate, promote             7 monitoring: live accuracy against actuals, drift, alerts
 4 start the API                       8 retraining trigger -> gated promotion -> a new run with the new model
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time

import httpx

from bsref import db
from bsref.config import home, load_env
from data import source_system, worker
from monitoring import job
from serving import batch
from training import retrain, train

load_env()
sys.stdout.reconfigure(line_buffering=True)
PORT = os.environ.get("API_PORT", "8000")
API = f"http://127.0.0.1:{PORT}"


def step(n: int, title: str) -> None:
    print(f"\n── {n}. {title} " + "─" * max(0, 70 - len(title)))


def show(obj: object) -> None:
    print(json.dumps(obj, indent=2, default=str))


def main() -> int:
    if not os.environ.get("JWT_SECRET"):
        raise SystemExit("no .env found: run `make setup` first")
    db.init_schema()
    step(1, "Seed the source system (simulated ERP + outbox)")
    show(source_system.seed())
    step(2, "CDC relay and ingestion (validate, upsert, apply restatements)")
    show(worker.run_once())
    step(3, "Backtest, gate and promote")
    first = train.run()
    show(first)
    if not first["promoted"]:
        raise SystemExit("the first model failed its gates; nothing to serve")
    step(4, f"Start the API on {API}")
    log = open(home() / "var" / "api.log", "w")
    api = subprocess.Popen([sys.executable, "-m", "uvicorn", "api.app:app", "--port", PORT, "--log-level", "warning"],
                           stdout=log, stderr=subprocess.STDOUT)
    try:
        for _ in range(60):
            try:
                if httpx.get(f"{API}/readyz", timeout=2).status_code == 200:
                    break
            except httpx.HTTPError:
                pass
            time.sleep(0.5)
        else:
            raise SystemExit("the API did not become ready; see var/api.log")
        print("ready")
        step(5, "Verify through the API (the forecast run is started by the planner role)")
        rc = subprocess.call([sys.executable, "scripts/verify.py"], env={**os.environ, "API_URL": API})
        if rc:
            return rc
        step(6, "Three weeks pass: actuals, restatements and late feeds arrive")
        show(source_system.advance())
        show(worker.run_once())
        step(7, "Monitoring job (the first run can now be scored against what actually sold)")
        show(job.run())
        step(8, "Retraining trigger, gated promotion and a new run")
        again = retrain.run()
        show(again)
        new_run = batch.run(started_by="demo")
        show(new_run)
        ok = (not again["retrained"]) or (not again["result"]["promoted"]) or new_run["model_version"] == again["result"]["version"]
        print(f"  {'PASS' if ok else 'FAIL'}  the newest run uses the production model {new_run['model_version']}")
        after = job.run()
        stale = "ForecastRunStale" in after["alerts_firing"]
        print(f"  {'FAIL' if stale else 'PASS'}  the stale-run alert resolved once the new run was written")
        if not ok or stale:
            return 1
        print("\nDEMO PASSED")
        return 0
    finally:
        api.terminate()
        api.wait(timeout=10)
        log.close()


if __name__ == "__main__":
    sys.exit(main())
