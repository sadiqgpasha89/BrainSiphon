"""Salesforce: SOQL read with paging (nextRecordsUrl), idempotent upsert by external id, JWT-bearer or client-credentials auth."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError
from ..core.registry import register

_IDENT = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")
_WATERMARK = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$")


@register
class SalesforceAdapter(Adapter):
    ID = "salesforce"
    TITLE = "Salesforce (Sales Cloud, Service Cloud)"
    PROTOCOL = "REST API v60: SOQL query, sObject upsert by external id; OAuth2 JWT bearer or client credentials"
    MOCK_NOTE = "Reproduces /query, nextRecordsUrl paging, /limits and PATCH upsert by external id with 201/204. Not a Salesforce org: no permission sets, field-level security or governor limits."
    CONNECTION = {"instance_url": {"required": True, "description": "https://<my-domain>.my.salesforce.com"}, "api_version": {"default": "v60.0"}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"object": {"required": True}, "fields": {"required": True}, "where": {"description": "SOQL condition; {watermark} is replaced by the last event time"}, "order_by": {}, "key_field": {"default": "Id"}, "event_time_field": {"default": "LastModifiedDate"}, "batch_size": {"default": 200}, "watermark": {}}
    WRITE = {"object": {"required": True}, "external_id_field": {"required": True, "description": "an External Id field, which makes the upsert idempotent"}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.v = self.conn.get("api_version", "v60.0")
        self.http = self.build_http(self.conn["instance_url"])

    def _soql(self, query: Dict[str, Any]) -> str:
        r = self.cfg["read"]
        for name in [r["object"], *r["fields"]]:
            if not _IDENT.match(name):
                raise ConfigError(f"'{name}' is not a valid Salesforce identifier")
        where = r.get("where", "")
        wm = query.get("watermark") or r.get("watermark")
        if "{watermark}" in where:
            if not wm or not _WATERMARK.match(wm):
                raise ConfigError("this query needs a 'watermark' ISO 8601 timestamp (read.watermark or query['watermark'])")
            where = where.replace("{watermark}", wm)
        q = f"SELECT {', '.join(r['fields'])} FROM {r['object']}"
        if where:
            q += f" WHERE {where}"
        if r.get("order_by"):
            q += f" ORDER BY {r['order_by']}"
        return q

    def _health(self) -> Health:
        d = self.http.get(f"/services/data/{self.v}/limits").json()
        rem = d["DailyApiRequests"]["Remaining"]
        return Health(rem > 100, {"daily_api_remaining": rem}, "" if rem > 100 else "daily API allowance almost exhausted")

    def _read_page(self, query: Dict[str, Any], cursor: Optional[str]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        if cursor is None:
            r = self.http.get(f"/services/data/{self.v}/query", params={"q": self._soql(query)}, headers={"Sforce-Query-Options": f"batchSize={self.cfg['read'].get('batch_size', 200)}"})
        else:
            r = self.http.get(cursor)
        d = r.json()
        rows = [{k: v for k, v in x.items() if k != "attributes"} for x in d["records"]]
        return rows, (None if d.get("done", True) else d["nextRecordsUrl"])

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        ext = w["external_id_field"]
        value = payload.get(ext) or idem_key
        body = {k: v for k, v in payload.items() if k != ext}
        r = self.http.patch(f"/services/data/{self.v}/sobjects/{w['object']}/{ext}/{value}", json_body=body)
        return {"created": r.status == 201, "id": (r.json() or {}).get("id") if r.body else None}
