"""ServiceNow Table API: paged read (sysparm_offset), idempotent upsert by correlation_id."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError
from ..core.registry import register


@register
class ServiceNowAdapter(Adapter):
    ID = "servicenow"
    TITLE = "ServiceNow (ITSM, CSM)"
    PROTOCOL = "REST Table API /api/now/table/{table}: sysparm_query, sysparm_limit, sysparm_offset; basic or OAuth2"
    MOCK_NOTE = "Reproduces Table API list/create/patch, X-Total-Count and the 401 error body. Not an instance: no ACLs, business rules or domain separation."
    CONNECTION = {"instance_url": {"required": True, "description": "https://<instance>.service-now.com"}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"table": {"default": "incident"}, "query": {"description": "encoded sysparm_query"}, "fields": {}, "page_size": {"default": 100}, "key_field": {"default": "sys_id"}, "event_time_field": {"default": "sys_updated_on"}}
    WRITE = {"table": {"default": "incident"}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.http = self.build_http(self.conn["instance_url"])

    def _table(self, section: str) -> str:
        t = self.cfg.get(section, {}).get("table", "incident")
        if not t.replace("_", "").isalnum():
            raise ConfigError(f"invalid table name {t!r}")
        return t

    def _health(self) -> Health:
        self.http.get(f"/api/now/table/{self._table('read')}", params={"sysparm_limit": 1})
        return Health(True, {})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[int]) -> Tuple[List[Dict[str, Any]], Optional[int]]:
        r = self.cfg["read"]
        offset = cursor or 0
        size = int(r.get("page_size", 100))
        params: Dict[str, Any] = {"sysparm_limit": size, "sysparm_offset": offset, "sysparm_exclude_reference_link": "true"}
        if r.get("query") or query.get("query"):
            params["sysparm_query"] = query.get("query") or r["query"]
        if r.get("fields"):
            params["sysparm_fields"] = ",".join(r["fields"])
        resp = self.http.get(f"/api/now/table/{self._table('read')}", params=params)
        rows = resp.json()["result"]
        total = int(resp.headers.get("x-total-count", offset + len(rows)))
        return rows, (offset + size if offset + size < total and rows else None)

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        t = self._table("write")
        found = self.http.get(f"/api/now/table/{t}", params={"sysparm_query": f"correlation_id={idem_key}", "sysparm_limit": 1}).json()["result"]
        if found:
            r = self.http.patch(f"/api/now/table/{t}/{found[0]['sys_id']}", json_body=payload)
            return {"created": False, "sys_id": found[0]["sys_id"]}
        r = self.http.post(f"/api/now/table/{t}", json_body={**payload, "correlation_id": idem_key})
        return {"created": True, "sys_id": r.json()["result"]["sys_id"]}
