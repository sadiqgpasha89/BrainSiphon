"""Zendesk adapter for the framework: incremental cursor export for reads, safe and idempotent writes for priority, type, group, assignee, tags, status and internal comments.

The ServiceNow and Salesforce Service Cloud adapters in the framework (`servicenow`, `salesforce`) cover the other two common platforms with the same interface."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from fde_adapters.core.adapter import Adapter, Health
from fde_adapters.core.errors import PermanentError, TransientError
from fde_adapters.core.registry import register


@register
class ZendeskAdapter(Adapter):
    ID = "zendesk"
    TITLE = "Zendesk Support"
    PROTOCOL = "REST API v2: incremental cursor export /incremental/tickets/cursor, PUT /tickets/{id} with safe_update; basic (email/token) or OAuth bearer"
    MOCK_NOTE = "pack mock reproduces the cursor export, GET/PUT ticket with safe_update 409, users/me and 429. It is not a Zendesk account: no triggers, SLAs, side conversations or rate-limit plan."
    CONNECTION = {"base_url": {"required": True, "description": "https://<subdomain>.zendesk.com"}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"start_time": {"required": True, "description": "epoch seconds to start the incremental export from"}, "key_field": {"default": "id"}, "event_time_field": {"default": "updated_at"}}
    WRITE = {"idempotency_fields": {}, "tag_prefix": {"default": "bs_"}}

    def _init(self) -> None:
        self.http = self.build_http(self.conn["base_url"])
        self.prefix = self.cfg.get("write", {}).get("tag_prefix", "bs_")

    def _health(self) -> Health:
        me = self.http.get("/api/v2/users/me.json").json()["user"]
        return Health(me.get("role") in ("agent", "admin"), {"user": me.get("email"), "role": me.get("role")})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[str]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        if cursor is None:
            r = self.http.get("/api/v2/incremental/tickets/cursor.json", params={"start_time": query.get("start_time") or self.cfg["read"]["start_time"]})
        else:
            r = self.http.get(cursor)
        d = r.json()
        return d["tickets"], (None if d.get("end_of_stream") else d["after_url"])

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        """payload: {"id", and any of priority, type, group_id, assignee_id, status, tags_add, comment (internal note text), custom_fields}. Applied exactly once per idempotency key,
        and never on top of a concurrent change: the update carries `updated_stamp` and Zendesk answers 409 if the ticket moved, in which case it is re-read and the decision re-applied once."""
        tid = payload["id"]
        marker = f"{self.prefix}{idem_key[:16]}"
        for attempt in (1, 2):
            t = self.http.get(f"/api/v2/tickets/{tid}.json").json()["ticket"]
            if marker in t.get("tags", []):
                return {"applied": False, "reason": "already applied"}
            body: Dict[str, Any] = {k: payload[k] for k in ("priority", "type", "group_id", "assignee_id", "status", "custom_fields") if k in payload}
            body["tags"] = sorted(set(t.get("tags", [])) | set(payload.get("tags_add", [])) | {marker})
            if payload.get("comment"):
                body["comment"] = {"body": payload["comment"], "public": False}  # an AI note is internal by default: a public reply is a separate, approved action
            body.update(safe_update=True, updated_stamp=t["updated_at"])
            try:
                r = self.http.put(f"/api/v2/tickets/{tid}.json", json_body={"ticket": body})
                return {"applied": True, "request_id": r.headers.get("x-request-id", "")}
            except PermanentError as e:
                if e.status == 409 and attempt == 1:
                    continue
                raise
        raise TransientError("ticket kept changing underneath the update")
