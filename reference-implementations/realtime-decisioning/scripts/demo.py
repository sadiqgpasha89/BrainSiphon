"""The whole system, end to end, in one command:  python scripts/demo.py   (or `make demo`)

 1 seed the source system            5 time passes: new transactions and chargebacks arrive (CDC -> ingest)
 2 CDC relay + streaming ingestion   6 verify live decisions, authorisation and the review queue through the API
 3 train, evaluate, gate, promote    7 monitoring job (drift, delayed ground truth, alerts)
 4 start the API                     8 retraining trigger -> gated promotion -> the API hot-swaps the model
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
    step(1, "Seed the source system (simulated payment switch + outbox)")
    show(source_system.seed())
    step(2, "CDC relay and streaming ingestion (validate, land, features, labels)")
    show(worker.run_once())
    step(3, "Train, evaluate, gate and promote")
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
        step(5, "Time passes: the held-back days of traffic and chargebacks arrive")
        show(source_system.advance())
        show(worker.run_once())
        step(6, "Verify through the API")
        rc = subprocess.call([sys.executable, "scripts/verify.py"], env={**os.environ, "API_URL": API})
        if rc:
            return rc
        step(7, "Monitoring job")
        show(job.run())
        step(8, "Retraining trigger, gated promotion and hot swap")
        again = retrain.run()
        show(again)
        if again["retrained"] and again["result"]["promoted"]:
            wanted = again["result"]["version"]
            r = httpx.post(f"{API}/auth/token", data={"username": "ml-admin", "password": os.environ["USER_ML_ADMIN_PASSWORD"]})
            hdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
            for _ in range(20):
                httpx.get(f"{API}/readyz")  # any request makes the scorer re-check the registry
                serving = httpx.get(f"{API}/v1/models", headers=hdr).json()["serving"]
                if serving == wanted:
                    break
                time.sleep(0.5)
            print(f"  {'PASS' if serving == wanted else 'FAIL'}  the running API now serves {wanted} without a restart")
            if serving != wanted:
                return 1
        print("\nDEMO PASSED")
        return 0
    finally:
        api.terminate()
        api.wait(timeout=10)
        log.close()


if __name__ == "__main__":
    sys.exit(main())
