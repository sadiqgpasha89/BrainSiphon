"""The whole system, end to end, in one command:  python scripts/demo.py   (or `make demo`)

 1 seed the security stack (24 past incidents, 6 live alerts)   5 six more alerts arrive, one with a planted instruction
 2 evaluate the agent on the labelled incidents, gate, promote  6 verify through the API: traces, approvals, four-eyes, verdicts
 3 CDC relay + case ingestion + the agent investigates          7 monitoring: overrides, missed threats, tool errors, alerts
 4 start the API                                                8 re-evaluation on the suite grown by the analysts' verdicts
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
    step(1, "Seed the simulated security stack")
    show(source_system.seed())
    step(2, "Evaluate the agent on the labelled incidents, gate and promote")
    first = train.run()
    show(first)
    if not first["promoted"]:
        raise SystemExit("the first agent version failed its gates; nothing may investigate")
    step(3, "CDC relay, case ingestion, and the agent investigates each new case")
    show(worker.run_once())
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
        step(5, "Six more alerts arrive (one carries text addressed to the agent)")
        show(source_system.advance())
        show(worker.run_once())
        step(6, "Verify through the API")
        rc = subprocess.call([sys.executable, "scripts/verify.py"], env={**os.environ, "API_URL": API})
        if rc:
            return rc
        step(7, "Monitoring job")
        mon = job.run()
        show(mon)
        step(8, "Re-evaluation on the suite grown by the analysts' verdicts")
        again = retrain.run()
        show({"evaluated": again["evaluated"], "reasons": again["reasons"],
              "result": {k: v for k, v in again.get("result", {}).items() if k != "failures"}})
        ok = again["evaluated"] and again["result"]["metrics"]["incidents"] == 36 and again["result"]["metrics"]["missed_threats"] == 0
        print(f"  {'PASS' if ok else 'FAIL'}  the agent was re-measured on 36 incidents (24 historical + 12 labelled by analysts)")
        if not ok:
            return 1
        print("\nDEMO PASSED")
        return 0
    finally:
        api.terminate()
        api.wait(timeout=10)
        log.close()


if __name__ == "__main__":
    sys.exit(main())
