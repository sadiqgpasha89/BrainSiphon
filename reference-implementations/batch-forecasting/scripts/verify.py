"""End-to-end verification against a RUNNING API: every check prints PASS or FAIL; the exit code is non-zero on a failure.

    python scripts/verify.py        (reads API_URL and the demo-user passwords from the environment / .env)

It plays the replenishment system (reads forecasts) and a demand planner (starts runs, decides held series, overrides).
"""

from __future__ import annotations

import os
import sys

import httpx

from bsref.config import load_env

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
    c = httpx.Client(base_url=API, timeout=120)
    print(f"verifying {API}")
    check("service is ready with a production model", c.get("/readyz").status_code == 200)
    consumer, planner, admin = token(c, "svc-replenishment"), token(c, "planner"), token(c, "ml-admin")

    print("authentication and authorisation")
    q = {"store_id": "S001", "sku": "K0001"}
    check("no token -> 401", c.get("/v1/forecasts", params=q).status_code == 401)
    check("the consumer may not start runs -> 403", c.post("/v1/runs", headers=consumer).status_code == 403)
    check("the planner may not promote models -> 403",
          c.post("/v1/models/v0001/promote", json={"reason": "not allowed"}, headers=planner).status_code == 403)

    print("batch run and forecast serving")
    run = c.post("/v1/runs", headers=planner).json()
    check("a forecast run exists for the newest sales day", run.get("status") == "complete",
          f"{run.get('run_id')}: {run.get('series')} series, {run.get('held')} held, completeness {run.get('completeness')}")
    again = c.post("/v1/runs", headers=planner).json()
    check("starting the same run again changes nothing (idempotent)", again.get("replayed") is True and again["run_id"] == run["run_id"])
    f = c.get("/v1/forecasts", params=q, headers=consumer).json()
    days = f.get("days", [])
    check("the consumer reads a 14-day forecast", len(days) == 14 and f["run_id"] == run["run_id"], f"status {f.get('status')}")
    check("quantiles are ordered and non-negative", all(0 <= d["p10"] <= d["p50"] <= d["p90"] for d in days))
    check("an unknown series -> 404", c.get("/v1/forecasts", params={"store_id": "S999", "sku": "K0001"}, headers=consumer).status_code == 404)

    print("human in the loop")
    tasks = c.get("/v1/reviews", headers=planner).json()
    mine = [t for t in tasks if t["payload"]["run_id"] == run["run_id"]]
    check("implausible series are held for a planner", len(mine) == run["held"] and len(mine) > 0, f"{len(mine)} held")
    if mine:
        t = mine[0]
        p = t["payload"]
        held = c.get("/v1/forecasts", params={"store_id": p["store_id"], "sku": p["sku"]}, headers=consumer).json()
        check("while held, consumers receive the baseline, not the model",
              held["status"] == "held" and all(d["final"] == d["baseline"] for d in held["days"]), f"ratio {p['ratio']}x")
        check("the planner claims the task", c.post(f"/v1/reviews/{t['id']}/claim", headers=planner).json()["status"] == "claimed")
        check("another planner cannot claim it (409)", c.post(f"/v1/reviews/{t['id']}/claim", headers=admin).status_code == 409)
        r = c.post(f"/v1/reviews/{t['id']}/decision", json={"verdict": "override", "factor": 0.9, "notes": "verify.py"}, headers=planner)
        after = c.get("/v1/forecasts", params={"store_id": p["store_id"], "sku": p["sku"]}, headers=consumer).json()
        check("the planner's override is what consumers now receive",
              r.status_code == 200 and after["status"] == "overridden"
              and all(abs(d["final"] - round(d["p50"] * 0.9, 3)) < 0.01 for d in after["days"]))
    for t in mine[1:]:  # clear the rest of the queue the way a planner would
        c.post(f"/v1/reviews/{t['id']}/decision", json={"verdict": "accept_model", "notes": "verify.py"}, headers=planner)
    check("the review queue for this run is empty afterwards",
          not [t for t in c.get("/v1/reviews", headers=planner).json() if t["payload"]["run_id"] == run["run_id"]])
    o = c.post("/v1/forecasts/override", json={**q, "factor": 1.2, "reason": "local festival next week"}, headers=planner)
    check("a planner can override any series with a reason", o.status_code == 200 and o.json()["status"] == "overridden")
    check("an override without a reason is rejected (422)",
          c.post("/v1/forecasts/override", json={**q, "factor": 1.2, "reason": ""}, headers=planner).status_code == 422)

    print("operations")
    check("Prometheus metrics are exposed", "forecast_requests_total" in c.get("/metrics").text)
    s = c.get("/v1/monitoring/summary", headers=planner).json()
    check("the monitoring summary reports the latest run", s["latest_run"]["run_id"] == run["run_id"])
    models = c.get("/v1/models", headers=admin).json()
    check("the registry lists versions with lineage", bool(models["versions"]) and "training_data_hash" in models["versions"][0])
    check("the planner console is served", c.get("/ui/").status_code == 200)

    print(f"\n{'VERIFICATION FAILED: ' + ', '.join(FAILED) if FAILED else 'VERIFICATION PASSED'}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
