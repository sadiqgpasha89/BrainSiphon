"""The whole system, end to end, in one command:  python scripts/demo.py   (or `make demo`)

 1 seed the source system (docs CMS)     5 verify through the API: answers, access control, injection, feedback, review
 2 CDC relay + ingestion + chunking      6 the docs team edits the site: one update, one delete, one new page
 3 build, evaluate, gate, promote index  7 monitoring: the index is now stale; quality on the grown evaluation set
 4 start the API                         8 re-index trigger -> gated promotion -> the API hot-swaps; answers are fresh
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
Q = "How often is sandbox data reset?"


def step(n: int, title: str) -> None:
    print(f"\n── {n}. {title} " + "─" * max(0, 70 - len(title)))


def show(obj: object) -> None:
    print(json.dumps(obj, indent=2, default=str))


def ask(question: str) -> dict:
    r = httpx.post(f"{API}/auth/token", data={"username": "customer", "password": os.environ["USER_CUSTOMER_PASSWORD"]})
    return httpx.post(f"{API}/v1/ask", json={"question": question}, headers={"Authorization": f"Bearer {r.json()['access_token']}"}).json()


def main() -> int:
    if not os.environ.get("JWT_SECRET"):
        raise SystemExit("no .env found: run `make setup` first")
    db.init_schema()
    step(1, "Seed the source system (simulated documentation CMS + outbox)")
    show(source_system.seed())
    step(2, "CDC relay and ingestion (validate, chunk, screen for injected instructions)")
    show(worker.run_once())
    step(3, "Build the index, evaluate the answer pipeline, gate and promote")
    first = train.run()
    show(first)
    if not first["promoted"]:
        raise SystemExit("the first index failed its gates; nothing to serve")
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
        step(5, "Verify through the API")
        rc = subprocess.call([sys.executable, "scripts/verify.py"], env={**os.environ, "API_URL": API})
        if rc:
            return rc
        before = ask(Q)
        print(f"  before the edit  Q: {Q}\n                   A: {before['answer']}")
        step(6, "The docs team edits the site: the sandbox page changes, a page is deleted, a page is published")
        show(source_system.advance())
        show(worker.run_once())
        step(7, "Monitoring job (the serving index no longer matches the documents)")
        mon = job.run()
        show(mon)
        ok_stale = "RagIndexStale" in mon["alerts_firing"]
        print(f"  {'PASS' if ok_stale else 'FAIL'}  the stale-index alert fired")
        step(8, "Re-index trigger, gated promotion and hot swap")
        again = retrain.run()
        show({k: v for k, v in again.items() if k != "result"} | {"result": {k: v for k, v in again.get("result", {}).items() if k != "failures"}})
        ok_swap = ok_fresh = True
        if again["rebuilt"] and again["result"]["promoted"]:
            wanted = again["result"]["version"]
            for _ in range(20):
                after = ask(Q)
                if after["index_version"] == wanted:
                    break
                time.sleep(0.5)
            ok_swap = after["index_version"] == wanted
            ok_fresh = "every day" in after["answer"] and after["citations"][0]["doc_version"] == 2
            print(f"  {'PASS' if ok_swap else 'FAIL'}  the running API now serves {wanted} without a restart")
            print(f"  {'PASS' if ok_fresh else 'FAIL'}  after the edit   A: {after['answer']}")
        resolved = "RagIndexStale" not in job.run()["alerts_firing"]
        print(f"  {'PASS' if resolved else 'FAIL'}  the stale-index alert resolved")
        if not (ok_stale and ok_swap and ok_fresh and resolved):
            return 1
        print("\nDEMO PASSED")
        return 0
    finally:
        api.terminate()
        api.wait(timeout=10)
        log.close()


if __name__ == "__main__":
    sys.exit(main())
