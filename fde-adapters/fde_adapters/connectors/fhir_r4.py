"""FHIR R4 REST client: search with paging, conditional create/update for idempotency, SMART backend-services style bearer auth."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import PermanentError
from ..core.registry import register
from ..protocols import fhir_map


@register
class FhirR4Adapter(Adapter):
    ID = "fhir-r4"
    TITLE = "FHIR R4 server (Epic, Oracle Health, HAPI, Azure Health Data Services, Google Cloud Healthcare API)"
    PROTOCOL = "FHIR R4 REST: search with Bundle paging (link next), conditional create (If-None-Exist) and conditional update, OAuth2 / SMART backend services"
    MOCK_NOTE = "Runs against a small FHIR-shaped mock (capability statement, search, conditional create). Not a vendor sandbox: no profile validation, no US Core or national profile checks, no scopes."
    CONNECTION = {"base_url": {"required": True}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"resource": {"required": True}, "search": {"description": "search parameters, e.g. {'_lastUpdated': 'gt2026-03-01', 'code': '2524-7'}"}, "page_size": {"default": 100}, "key_field": {"default": "id"}, "event_time_field": {"default": "effectiveDateTime"}}
    WRITE = {"resource_type": {"required": True}, "identifier_system": {"required": True}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.http = self.build_http(self.conn["base_url"], headers={"Accept": "application/fhir+json"})

    def _health(self) -> Health:
        d = self.http.get("/metadata").json()
        return Health(d.get("fhirVersion", "").startswith("4."), {"fhir_version": d.get("fhirVersion"), "software": (d.get("software") or {}).get("name")})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[str]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        r = self.cfg["read"]
        if cursor is None:
            params = {"_count": r.get("page_size", 100), **(query.get("search") or r.get("search") or {})}
            resp = self.http.get(f"/{r['resource']}", params=params)
        else:
            resp = self.http.get(cursor)
        b = resp.json()
        rows = [e["resource"] for e in b.get("entry", []) if "resource" in e]
        nxt = next((l["url"] for l in b.get("link", []) if l.get("relation") == "next"), None)
        return rows, nxt

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        ident = {"system": w["identifier_system"], "value": idem_key}
        body = {**fhir_map.strip_internal(payload), "resourceType": w["resource_type"], "identifier": [ident]}
        r = self.http.post(f"/{w['resource_type']}", json_body=body, headers={"If-None-Exist": f"identifier={ident['system']}|{ident['value']}", "Prefer": "return=minimal", "Content-Type": "application/fhir+json"})
        return {"created": r.status == 201, "location": r.headers.get("location", "")}
