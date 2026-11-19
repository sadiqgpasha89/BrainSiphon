"""A Zendesk-shaped mock for the pack's tests and for FDE development without access."""
from __future__ import annotations

from typing import Any, Dict, List

from fde_adapters.mocks.server import MockRequest, MockServer


def server(n: int = 5, page: int = 2) -> MockServer:
    srv = MockServer("zendesk")
    srv.state["tickets"] = {i: {"id": i, "subject": s, "description": d, "status": "new", "priority": None, "type": None, "tags": [], "group_id": None, "assignee_id": None, "requester_id": 900 + i, "organization_id": 70 + i % 2,
                                "updated_at": f"2026-03-1{i}T10:00:00Z", "created_at": f"2026-03-1{i}T09:00:00Z", "custom_fields": [{"id": 1, "value": None}], "comments": []}
                           for i, (s, d) in enumerate([("Cannot log in", "SSO loop after password reset"), ("Invoice wrong", "Charged twice this month"), ("API 500 errors", "Production outage on /v2/orders"), ("Feature request", "Please add dark mode"), ("No puedo acceder", "Error al iniciar sesión")][:n], start=1)}
    srv.state["me"] = {"user": {"id": 1, "email": "bot@acme.example", "role": "agent"}}

    def export(r: MockRequest):
        if not r.headers.get("Authorization"):
            return 401, {}, {"error": "Couldn't authenticate you"}
        start = int(r.q("cursor_pos", "0") or 0)
        rows = list(srv.state["tickets"].values())[start : start + page]
        end = start + page >= len(srv.state["tickets"])
        return 200, {}, {"tickets": rows, "after_cursor": str(start + page), "after_url": f"{srv.base}/api/v2/incremental/tickets/cursor.json?cursor_pos={start + page}", "end_of_stream": end, "end_time": 1772000000}

    def get(r: MockRequest):
        tid = int(r.path.split("/")[-1].split(".")[0])
        t = srv.state["tickets"].get(tid)
        return (200, {}, {"ticket": t}) if t else (404, {}, {"error": "RecordNotFound"})

    def put(r: MockRequest):
        tid = int(r.path.split("/")[-1].split(".")[0])
        t = srv.state["tickets"].get(tid)
        if not t:
            return 404, {}, {"error": "RecordNotFound"}
        body = r.json()["ticket"]
        if body.get("safe_update") and body.get("updated_stamp") != t["updated_at"]:
            return 409, {}, {"error": "UpdateConflict", "description": "Another user has made changes to this ticket"}
        for k in ("priority", "type", "group_id", "assignee_id", "status", "tags", "custom_fields"):
            if k in body:
                t[k] = body[k]
        if "comment" in body:
            t["comments"].append(body["comment"])
        t["updated_at"] = f"2026-03-14T{10 + len(t['comments']):02d}:00:00Z"
        srv.state.setdefault("writes", 0)
        srv.state["writes"] += 1
        return 200, {"X-Request-Id": "zd-req-1"}, {"ticket": t}

    srv.route("GET", r"/api/v2/users/me\.json", lambda r: (200, {}, srv.state["me"]))
    srv.route("GET", r"/api/v2/incremental/tickets/cursor\.json", export)
    srv.route("GET", r"/api/v2/tickets/\d+\.json", get)
    srv.route("PUT", r"/api/v2/tickets/\d+\.json", put)
    return srv
