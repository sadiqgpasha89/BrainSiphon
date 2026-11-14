"""Microsoft Dynamics 365 / Dataverse Web API (OData v4): paged read via @odata.nextLink, upsert by alternate key."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.registry import register


@register
class Dynamics365Adapter(Adapter):
    ID = "dynamics365"
    TITLE = "Microsoft Dynamics 365 (Dataverse)"
    PROTOCOL = "OData v4 Web API /api/data/v9.2: $select, $filter, @odata.nextLink; Microsoft Entra ID client credentials (scope <org>/.default)"
    MOCK_NOTE = "Reproduces WhoAmI, paged list with @odata.nextLink and PATCH upsert on an alternate key (204 + OData-EntityId). Not an environment: no security roles, business units or plugins."
    CONNECTION = {"org_url": {"required": True, "description": "https://<org>.crm.dynamics.com"}, "api_path": {"default": "/api/data/v9.2"}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"entity_set": {"required": True}, "select": {}, "filter": {}, "page_size": {"default": 100}, "key_field": {"default": "incidentid"}, "event_time_field": {"default": "modifiedon"}}
    WRITE = {"entity_set": {"required": True}, "alternate_key": {"required": True, "description": "an alternate key column: makes the upsert idempotent"}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.api = self.conn.get("api_path", "/api/data/v9.2")
        self.http = self.build_http(self.conn["org_url"], headers={"OData-MaxVersion": "4.0", "OData-Version": "4.0"})

    def _health(self) -> Health:
        d = self.http.get(f"{self.api}/WhoAmI").json()
        return Health(True, {"user_id": d.get("UserId"), "organization_id": d.get("OrganizationId")})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[str]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        r = self.cfg["read"]
        if cursor is None:
            params: Dict[str, Any] = {}
            if r.get("select"): params["$select"] = ",".join(r["select"])
            if r.get("filter") or query.get("filter"): params["$filter"] = query.get("filter") or r["filter"]
            resp = self.http.get(f"{self.api}/{r['entity_set']}", params=params, headers={"Prefer": f"odata.maxpagesize={r.get('page_size', 100)}"})
        else:
            resp = self.http.get(cursor)
        d = resp.json()
        return d["value"], d.get("@odata.nextLink")

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        alt = w["alternate_key"]
        value = str(payload.get(alt) or idem_key).replace("'", "''")
        body = {k: v for k, v in payload.items() if k != alt}
        r = self.http.patch(f"{self.api}/{w['entity_set']}({alt}='{value}')", json_body={**body, alt: value})
        return {"created": "odata-entityid" in r.headers, "entity": r.headers.get("odata-entityid", "")}
