"""End-to-end verification against a RUNNING API: every check prints PASS or FAIL and the script exits non-zero on a failure.

    python scripts/verify.py                 (reads API_URL and the demo-user passwords from the environment / .env)

It plays three parts: the payment gateway (asks for decisions), the payment switch (commits approved transactions to the
source database, from where CDC carries them to the feature store) and a fraud analyst (works the review queue).
"""

from __future__ import annotations

import os
import sys
import time
import uuid

import httpx
from sqlalchemy import func, select

from bsref import db
from bsref.config import load_env
from data import schema, source_system, worker

load_env()
API = os.environ.get("API_URL", f"http://127.0.0.1:{os.environ.get('API_PORT', '8000')}")
FAILED: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))
    if not ok:
        FAILED.append(name)


def token(client: httpx.Client, user: str) -> dict[str, str]:
    env = "USER_" + user.upper().replace("-", "_") + "_PASSWORD"
    r = client.post("/auth/token", data={"username": user, "password": os.environ[env]})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def main() -> int:
    c = httpx.Client(base_url=API, timeout=20)
    print(f"verifying {API}")
    check("service is ready with a production model", c.get("/readyz").status_code == 200)
    gateway, analyst, admin = token(c, "svc-gateway"), token(c, "analyst"), token(c, "ml-admin")

    # an established card, its usual merchant and device, and a typical amount, read from the landed history
    with db.tx() as conn:
        card = conn.execute(
            select(schema.raw_transactions.c.card_id).where(schema.raw_transactions.c.device_id < 500000)
            .group_by(schema.raw_transactions.c.card_id).order_by(func.count().desc()).limit(1)
        ).scalar_one()
        last = conn.execute(
            select(schema.raw_transactions).where(schema.raw_transactions.c.card_id == card)
            .order_by(schema.raw_transactions.c.event_time.desc()).limit(1)
        ).mappings().one()
        typical = conn.execute(
            select(func.avg(schema.raw_transactions.c.amount)).where(schema.raw_transactions.c.card_id == card)
        ).scalar_one()
    run = uuid.uuid4().hex[:8]
    now = time.time()
    benign = {"txn_id": f"live-{run}-ok", "card_id": card, "merchant_id": last["merchant_id"], "device_id": last["device_id"],
              "amount": round(typical, 2), "rail": last["rail"], "country": last["country"], "event_time": now}

    print("authentication and authorisation")
    check("no token -> 401", c.post("/v1/decisions", json=benign).status_code == 401)
    check("analyst may not request decisions -> 403", c.post("/v1/decisions", json=benign, headers=analyst).status_code == 403)
    check("gateway may not promote models -> 403",
          c.post("/v1/models/v0001/promote", json={"reason": "not allowed"}, headers=gateway).status_code == 403)

    print("online decisions")
    r = c.post("/v1/decisions", json=benign, headers=gateway)
    d = r.json()
    check("a typical payment on a known device is ALLOWed", r.status_code == 200 and d["action"] == "ALLOW",
          f"score={d.get('score')}, {d.get('latency_ms')} ms, model {d.get('model_version')}")
    check("the model answered, not the fallback", d.get("fallback") is False)
    check("a retry with the same idempotency key returns the same decision", c.post("/v1/decisions", json=benign, headers=gateway).json() == d)
    check("a request that violates the contract is rejected (422)",
          c.post("/v1/decisions", json={**benign, "txn_id": f"live-{run}-bad", "amount": -1}, headers=gateway).status_code == 422)
    source_system.authorise(benign)
    worker.run_once()

    # account takeover: a burst of large payments from a device the card has never used
    blocked, actions = None, []
    for i in range(8):
        attack = {"txn_id": f"live-{run}-atk{i}", "card_id": card, "merchant_id": 300 + i, "device_id": 990000 + int(run[:4], 16),
                  "amount": round(typical * 6, 2), "rail": last["rail"], "country": "AE", "event_time": now + 30 + i * 45}
        a = c.post("/v1/decisions", json=attack, headers=gateway).json()
        actions.append(a["action"])
        if a["action"] == "BLOCK":
            blocked = (attack, a)
            break
        source_system.authorise(attack)  # the switch approved it (after a step-up); CDC updates the velocity features
        worker.run_once()
    check("an account-takeover burst is escalated and BLOCKed", blocked is not None, " -> ".join(actions))
    if blocked:
        check("the decision carries a human-readable reason", len(blocked[1]["reason"]) > 10, blocked[1]["reason"])

    print("human in the loop")
    if blocked:
        tasks = c.get("/v1/reviews", headers=analyst).json()
        task = next((t for t in tasks if t["subject_id"] == blocked[0]["txn_id"]), None)
        check("the blocked payment is in the analyst review queue", task is not None)
        if task:
            check("the analyst claims the task", c.post(f"/v1/reviews/{task['id']}/claim", headers=analyst).json()["status"] == "claimed")
            check("a second reviewer cannot claim it (409)", c.post(f"/v1/reviews/{task['id']}/claim", headers=admin).status_code == 409)
            r = c.post(f"/v1/reviews/{task['id']}/decision", json={"verdict": "fraud", "notes": "verify.py"}, headers=analyst)
            check("the analyst confirms fraud", r.status_code == 200 and r.json()["status"] == "approved")
            with db.tx() as conn:
                lab = conn.execute(select(schema.labels.c.is_fraud, schema.labels.c.source)
                                   .where(schema.labels.c.txn_id == blocked[0]["txn_id"])).first()
            check("the verdict became a training label", lab is not None and tuple(lab) == (1, "analyst"))

    print("operations")
    m = c.get("/metrics").text
    check("Prometheus metrics are exposed", "fraud_decisions_total" in m and "http_request_duration_seconds" in m)
    s = c.get("/v1/monitoring/summary", headers=analyst).json()
    check("the monitoring summary reports the serving model", s["model_version"].startswith("v"), str(s["decisions_24h"]))
    models = c.get("/v1/models", headers=admin).json()
    check("the registry lists versions with lineage", bool(models["versions"]) and "training_data_hash" in models["versions"][0])
    check("the analyst console is served", c.get("/ui/").status_code == 200)

    print(f"\n{'VERIFICATION FAILED: ' + ', '.join(FAILED) if FAILED else 'VERIFICATION PASSED'}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
