"""End-to-end verification against a RUNNING API: every check prints PASS or FAIL; the exit code is non-zero on a failure.

    python scripts/verify.py        (reads API_URL and the demo-user passwords from the environment / .env)

It plays a tier-1 analyst, an incident responder and the SOC lead. It reads the simulator's ground truth only to play a
correct analyst, and the simulated security stack only to check that approved actions really took effect.
"""

from __future__ import annotations

import os
import sys

import httpx
from sqlalchemy import select

from bsref import db
from bsref.config import load_env
from data import schema, source_system

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


def source(table, key, value, column):
    with db.tx(db.source_engine()) as conn:
        return conn.execute(select(column).select_from(table).where(key == value)).scalar()


def main() -> int:
    c = httpx.Client(base_url=API, timeout=120)
    print(f"verifying {API}")
    check("service is ready with a production agent version", c.get("/readyz").status_code == 200)
    analyst, responder, lead = token(c, "analyst"), token(c, "responder"), token(c, "soc-lead")
    truth = source_system.truth_for_live()

    print("authentication and authorisation")
    check("no token -> 401", c.get("/v1/cases").status_code == 401)
    check("an analyst may not approve containment -> 403", c.get("/v1/approvals", headers=analyst).status_code == 403)
    check("a responder may not manage agent versions -> 403", c.post("/v1/agent/evaluate", headers=responder).status_code == 403)

    print("investigations")
    cases = {k["case_id"]: k for k in c.get("/v1/cases", headers=analyst).json()}
    done = [k for k in cases.values() if k["agent_verdict"]]
    check("every ingested alert was investigated", len(done) == len(cases) > 0, f"{len(done)} cases")
    wrong_benign = [k["case_id"] for k in done if k["agent_verdict"] == "benign" and truth[k["case_id"]]["verdict"] == "true_positive"]
    check("no real attack was closed as benign", not wrong_benign, ", ".join(wrong_benign))
    acted_on_benign = [k["case_id"] for k in done if k["status"] == "awaiting_approval" and truth[k["case_id"]]["verdict"] == "benign"]
    check("no containment was proposed for a benign case", not acted_on_benign, ", ".join(acted_on_benign))
    one = c.get(f"/v1/cases/{done[0]['case_id']}", headers=analyst).json()
    check("each case has a full tool trace", len(one["trace"]) == one["steps"] > 0 and all("result" in s for s in one["trace"]),
          " -> ".join(s["tool"] for s in one["trace"]))
    check("re-running an investigation changes nothing (idempotent)",
          c.post(f"/v1/cases/{done[0]['case_id']}/investigate", headers=analyst).json()["replayed"] is True)
    inj = [k for k in done if k["injection_suspected"]]
    if inj:
        check("a planted instruction in telemetry did not close the case as benign",
              all(k["agent_verdict"] != "benign" for k in inj), f"{inj[0]['case_id']}: {inj[0]['agent_verdict']}")

    print("human approval of containment")
    tasks = c.get("/v1/approvals", headers=responder).json()
    check("proposed actions are waiting for approval, none was executed by the agent", len(tasks) > 0, f"{len(tasks)} pending")
    normal = next((t for t in tasks if t["required_approvals"] == 1 and t["payload"]["action"] == "isolate_host"), None)
    if normal:
        host = normal["payload"]["target"]
        check("before approval the host is not isolated", source(schema.core_hosts, schema.core_hosts.c.host, host, schema.core_hosts.c.isolated) == 0)
        r = c.post(f"/v1/approvals/{normal['id']}/decision", json={"decision": "approve", "notes": "verify.py"}, headers=responder).json()
        check("one approval executes the action on a normal asset",
              r["action"]["status"] == "executed" and source(schema.core_hosts, schema.core_hosts.c.host, host, schema.core_hosts.c.isolated) == 1, host)
    crit = next((t for t in tasks if t["required_approvals"] == 2), None)
    if crit:
        host = crit["payload"]["target"]
        r1 = c.post(f"/v1/approvals/{crit['id']}/decision", json={"decision": "approve"}, headers=responder).json()
        check("a critical asset is NOT touched after one approval",
              r1["action"]["status"] == "pending" and source(schema.core_hosts, schema.core_hosts.c.host, host, schema.core_hosts.c.isolated) == 0, host)
        check("the same person cannot approve twice (409)",
              c.post(f"/v1/approvals/{crit['id']}/decision", json={"decision": "approve"}, headers=responder).status_code == 409)
        r2 = c.post(f"/v1/approvals/{crit['id']}/decision", json={"decision": "approve"}, headers=lead).json()
        check("a second, different approver executes it",
              r2["action"]["status"] == "executed" and source(schema.core_hosts, schema.core_hosts.c.host, host, schema.core_hosts.c.isolated) == 1)
    rej = next((t for t in tasks if t["payload"]["action"] == "block_ip"), None)
    if rej:
        r = c.post(f"/v1/approvals/{rej['id']}/decision", json={"decision": "reject", "notes": "shared egress address"}, headers=lead).json()
        blocked = source(schema.core_blocked_ips, schema.core_blocked_ips.c.ip, rej["payload"]["target"], schema.core_blocked_ips.c.ip)
        check("a rejected action is never executed", r["action"]["status"] == "rejected" and blocked is None)
    for t in c.get("/v1/approvals", headers=lead).json():  # clear what is left the way a responder would
        c.post(f"/v1/approvals/{t['id']}/decision", json={"decision": "approve"}, headers=lead if t["decisions"] else responder)
        if t["required_approvals"] == 2 and not t["decisions"]:
            c.post(f"/v1/approvals/{t['id']}/decision", json={"decision": "approve"}, headers=lead)

    print("analyst verdicts (feedback)")
    human = [k for k in c.get("/v1/cases?status=needs_human", headers=analyst).json()]
    check("ambiguous cases were left to a person", len(human) > 0, f"{len(human)} cases")
    before = c.get("/v1/monitoring/summary", headers=analyst).json()["labelled_incidents"]
    for k in c.get("/v1/cases", headers=analyst).json():
        c.post(f"/v1/cases/{k['case_id']}/verdict", json={"verdict": truth[k["case_id"]]["verdict"], "notes": "verify.py"}, headers=analyst)
    s = c.get("/v1/monitoring/summary", headers=analyst).json()
    check("every final verdict became a labelled incident", s["labelled_incidents"] == before + len(cases), f"{before} -> {s['labelled_incidents']}")
    check("cases left to a person are closed by the analyst's verdict", not c.get("/v1/cases?status=needs_human", headers=analyst).json())

    print("operations")
    check("Prometheus metrics are exposed", "agent_approval_decisions_total" in c.get("/metrics").text)
    v = c.get("/v1/agent", headers=lead).json()
    check("the registry lists agent versions with their evaluation", "decided_accuracy" in v["versions"][0]["metrics"] and v["production"])
    check("the console is served", c.get("/ui/").status_code == 200)

    print(f"\n{'VERIFICATION FAILED: ' + ', '.join(FAILED) if FAILED else 'VERIFICATION PASSED'}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
