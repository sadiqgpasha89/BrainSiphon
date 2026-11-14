"""Workforce-management and roster integration: read availability, skills and assigned shifts; write *proposals*, never shifts.

The recommendation reaches the roster system as a proposal for the branch manager. It becomes a shift only after approval, and the connector verifies the approval status before it applies anything."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

from fde_adapters.core.adapter import Adapter, Health
from fde_adapters.core.errors import PermanentError
from fde_adapters.core.registry import register
from fde_adapters.mocks.server import MockRequest, MockServer


@register
class WfmRosterAdapter(Adapter):
    ID = "wfm-roster"
    TITLE = "Workforce management / rostering (UKG, Workday, Quinyx, Legion, ADP, or a generic REST roster API)"
    PROTOCOL = "REST: GET /employees, GET /shifts, POST /shift-proposals (idempotent by proposal id), GET /shift-proposals/{id}; OAuth2 client credentials"
    MOCK_NOTE = "Generic roster API shape. Real products differ in resource names, scheduling-period models and approval endpoints: map them in `config` and verify with the vendor's sandbox."
    CONNECTION = {"base_url": {"required": True}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"resource": {"default": "shifts"}, "from_date": {}, "to_date": {}, "location_id": {}, "key_field": {"default": "id"}, "event_time_field": {}}
    WRITE = {"idempotency_fields": {}}

    def _init(self) -> None:
        self.http = self.build_http(self.conn["base_url"])

    def _health(self) -> Health:
        self.http.get("/employees", params={"limit": 1})
        return Health(True, {})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[int]) -> Tuple[List[Dict[str, Any]], Optional[int]]:
        r = self.cfg.get("read", {})
        res = query.get("resource") or r.get("resource", "shifts")
        offset = cursor or 0
        params: Dict[str, Any] = {"limit": 100, "offset": offset}
        for k in ("from_date", "to_date", "location_id"):
            if query.get(k) or r.get(k):
                params[k] = query.get(k) or r[k]
        resp = self.http.get(f"/{res}", params=params)
        rows = resp.json()["items"]
        total = int(resp.headers.get("x-total-count", offset + len(rows)))
        return rows, (offset + 100 if offset + 100 < total and rows else None)

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        r = self.http.post("/shift-proposals", json_body={**payload, "proposal_id": idem_key, "source": "brainsiphon", "status": "pending-manager-approval"}, idempotency_key=idem_key)
        return {"proposal_id": idem_key, "created": r.status == 201}

    def proposal_status(self, proposal_id: str) -> Dict[str, Any]:
        return self.http.get(f"/shift-proposals/{proposal_id}").json()

    def apply_if_approved(self, proposal_id: str) -> Dict[str, Any]:
        """Ask the roster system to publish the proposal's shifts, but only if a manager approved it *in the roster system*. Anything else is refused here, not only there."""
        p = self.proposal_status(proposal_id)
        if p.get("status") != "approved" or not p.get("approved_by"):
            raise PermanentError(f"proposal {proposal_id} is {p.get('status')}: a branch manager must approve it first")
        return self.http.post(f"/shift-proposals/{proposal_id}/publish", json_body={"approved_by": p["approved_by"]}, idempotency_key=f"publish-{proposal_id}").json()


def mock_wfm() -> MockServer:
    srv = MockServer("wfm")
    srv.state["proposals"] = {}
    srv.state["employees"] = [{"id": f"E{i}", "name": f"Employee {i}", "skills": ["teller"] + (["advisory"] if i % 3 == 0 else []), "location_id": "BR-0012", "contract_hours": 37.5} for i in range(1, 8)]
    srv.state["shifts"] = [{"id": f"S{i}", "emp": f"E{1 + i % 7}", "date": "2026-03-16", "start": 9, "end": 17, "location_id": "BR-0012"} for i in range(5)]

    def lst(key):
        def fn(r: MockRequest):
            items = srv.state[key]
            o, l = int(r.q("offset", "0")), int(r.q("limit", "100"))
            return 200, {"X-Total-Count": str(len(items))}, {"items": items[o : o + l]}
        return fn

    def create(r: MockRequest):
        b = r.json()
        pid = b["proposal_id"]
        if pid in srv.state["proposals"]:
            return 200, {}, srv.state["proposals"][pid]
        srv.state["proposals"][pid] = {**b, "status": "pending"}
        return 201, {}, srv.state["proposals"][pid]

    def get(r: MockRequest):
        p = srv.state["proposals"].get(r.path.rsplit("/", 1)[1])
        return (200, {}, p) if p else (404, {}, {"error": "no such proposal"})

    def publish(r: MockRequest):
        pid = r.path.split("/")[-2]
        srv.state["proposals"][pid]["status"] = "published"
        return 200, {}, {"published": pid}

    srv.route("GET", r"/employees", lst("employees"))
    srv.route("GET", r"/shifts", lst("shifts"))
    srv.route("POST", r"/shift-proposals", create)
    srv.route("GET", r"/shift-proposals/[^/]+", get)
    srv.route("POST", r"/shift-proposals/[^/]+/publish", publish)
    return srv
