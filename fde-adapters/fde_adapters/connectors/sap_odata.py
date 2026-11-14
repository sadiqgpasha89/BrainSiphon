"""SAP S/4HANA, ECC and Business Suite via OData (V2 and V4): paging, CSRF-token handshake for writes, check-then-create idempotency."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import PermanentError
from ..core.registry import register


@register
class SapODataAdapter(Adapter):
    ID = "sap-odata"
    TITLE = "SAP (S/4HANA, ECC) through the SAP Gateway"
    PROTOCOL = "OData V2 /sap/opu/odata/sap/<SERVICE> (and V4): $top/$skip, __next; X-CSRF-Token fetch for POST/PATCH; basic or OAuth2"
    MOCK_NOTE = "Reproduces the V2 envelope {d:{results,__next}}, the CSRF fetch-then-send handshake bound to a session cookie, and the 403 on a missing token. Not an SAP system: no authorisation objects, no BAPI/IDoc, no client logic."
    CONNECTION = {"base_url": {"required": True, "description": "https://<host>:<port>"}, "service": {"required": True, "description": "e.g. API_SALES_ORDER_SRV"}, "odata_version": {"default": "v2"}, "sap_client": {}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"entity_set": {"required": True}, "select": {}, "filter": {}, "page_size": {"default": 100}, "key_field": {"default": "SalesOrder"}, "event_time_field": {}}
    WRITE = {"entity_set": {"required": True}, "reference_field": {"required": True, "description": "a customer-extension field that stores the idempotency key (e.g. YY1_BSKey)"}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.v4 = self.conn.get("odata_version", "v2") == "v4"
        root = "/sap/opu/odata4/sap" if self.v4 else "/sap/opu/odata/sap"
        self.root = f"{root}/{self.conn['service']}"
        hdr = dict(self.conn.get("headers") or {})
        if self.conn.get("sap_client"):
            hdr["sap-client"] = str(self.conn["sap_client"])
        self.conn["headers"] = hdr
        self.http = self.build_http(self.conn["base_url"])
        self._csrf: Optional[str] = None

    def _health(self) -> Health:
        self.http.get(f"{self.root}/{self.cfg['read']['entity_set']}", params={"$top": 1})
        return Health(True, {})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[str]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        r = self.cfg["read"]
        if cursor is None:
            params: Dict[str, Any] = {"$top": r.get("page_size", 100), "$skip": 0, "$format": "json"}
            if r.get("select"): params["$select"] = ",".join(r["select"])
            if r.get("filter") or query.get("filter"): params["$filter"] = query.get("filter") or r["filter"]
            resp = self.http.get(f"{self.root}/{r['entity_set']}", params=params)
        else:
            resp = self.http.get(cursor)
        d = resp.json()
        if self.v4:
            return d["value"], d.get("@odata.nextLink")
        return d["d"]["results"], d["d"].get("__next")

    def _token(self) -> str:
        if not self._csrf:
            r = self.http.get(f"{self.root}/", headers={"X-CSRF-Token": "Fetch"})
            self._csrf = r.headers.get("x-csrf-token")
            if not self._csrf:
                raise PermanentError("SAP did not return an X-CSRF-Token: check the service is active in /IWFND/MAINT_SERVICE and the user may call it")
        return self._csrf

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        ref = w["reference_field"]
        esc = idem_key.replace("'", "''")
        found = self.http.get(f"{self.root}/{w['entity_set']}", params={"$filter": f"{ref} eq '{esc}'", "$top": 1, "$format": "json"}).json()
        rows = found["value"] if self.v4 else found["d"]["results"]
        if rows:
            return {"created": False}
        try:
            self.http.post(f"{self.root}/{w['entity_set']}", json_body={**payload, ref: idem_key}, headers={"X-CSRF-Token": self._token()})
        except PermanentError:
            raise
        except Exception:
            self._csrf = None  # the token is tied to a session: refetch it on the next attempt
            raise
        return {"created": True}
