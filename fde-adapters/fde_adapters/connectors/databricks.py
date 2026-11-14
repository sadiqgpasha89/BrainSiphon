"""Databricks SQL Statement Execution API: parameterised statements, polling, chunked results, MERGE INTO for idempotent writes."""
from __future__ import annotations

import re
import time
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError, PermanentError, TransientError
from ..core.registry import register

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*){0,2}$")


@register
class DatabricksAdapter(Adapter):
    ID = "databricks"
    TITLE = "Databricks (SQL warehouse, Unity Catalog)"
    PROTOCOL = "SQL Statement Execution API 2.0 POST /api/2.0/sql/statements, INLINE JSON_ARRAY chunks; PAT or OAuth M2M bearer"
    MOCK_NOTE = "Reproduces statement submission with named parameters, PENDING then SUCCEEDED polling, chunk links and a MERGE result. SQL is not executed."
    CONNECTION = {"workspace_url": {"required": True, "description": "https://<workspace>.cloud.databricks.com"}, "warehouse_id": {"required": True}, "catalog": {}, "schema": {}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"statement": {"required": True}, "parameters": {}, "key_field": {"default": "sku_id"}, "event_time_field": {}, "poll_attempts": {"default": 20}, "poll_interval": {"default": 0.5}}
    WRITE = {"table": {"required": True}, "key_column": {"required": True}, "columns": {"required": True}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.http = self.build_http(self.conn["workspace_url"])
        self._cols: List[str] = []

    def _run(self, sql: str, params: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        body: Dict[str, Any] = {"warehouse_id": self.conn["warehouse_id"], "statement": sql, "wait_timeout": "10s", "on_wait_timeout": "CONTINUE", "disposition": "INLINE", "format": "JSON_ARRAY"}
        for k in ("catalog", "schema"):
            if self.conn.get(k):
                body[k] = self.conn[k]
        if params:
            body["parameters"] = params
        d = self.http.post("/api/2.0/sql/statements/", json_body=body).json()
        tries = int(self.cfg.get("read", {}).get("poll_attempts", 20))
        for _ in range(tries):
            st = d["status"]["state"]
            if st == "SUCCEEDED":
                return d
            if st in ("FAILED", "CANCELED", "CLOSED"):
                raise PermanentError(f"statement {st}: {d['status'].get('error', {}).get('message', '')}")
            time.sleep(float(self.cfg.get("read", {}).get("poll_interval", 0.5)) if self.cfg.get("read", {}).get("poll_interval") else 0.0)
            d = self.http.get(f"/api/2.0/sql/statements/{d['statement_id']}").json()
        raise TransientError("statement did not finish within the polling budget")

    def _health(self) -> Health:
        d = self._run("SELECT 1")
        return Health(True, {"statement_id": d["statement_id"]})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[str]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        r = self.cfg["read"]
        if cursor is None:
            d = self._run(r["statement"], query.get("parameters", r.get("parameters")))
            self._cols = [c["name"] for c in d["manifest"]["schema"]["columns"]]
            res = d["result"]
        else:
            res = self.http.get(cursor).json()
        return [dict(zip(self._cols, x)) for x in res["data_array"]], res.get("next_chunk_internal_link")

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        for ident in [w["table"], w["key_column"], *w["columns"]]:
            if not _IDENT.match(ident):
                raise ConfigError(f"'{ident}' is not a valid identifier")
        cols = [w["key_column"], *[c for c in w["columns"] if c != w["key_column"]]]
        sql = (f"MERGE INTO {w['table']} t USING (SELECT :k AS {w['key_column']}, " + ", ".join(f":v{i} AS {c}" for i, c in enumerate(cols[1:])) +
               f") s ON t.{w['key_column']} = s.{w['key_column']} WHEN MATCHED THEN UPDATE SET * WHEN NOT MATCHED THEN INSERT *")
        params = [{"name": "k", "value": str(payload.get(w["key_column"]) or idem_key)}] + [{"name": f"v{i}", "value": str(payload.get(c))} for i, c in enumerate(cols[1:])]
        self._run(sql, params)
        return {"created": True}
