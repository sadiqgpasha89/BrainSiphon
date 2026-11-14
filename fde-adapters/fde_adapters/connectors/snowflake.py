"""Snowflake SQL API v2: statements with bound parameters, async polling, partitioned result sets, MERGE for idempotent writes."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError, PermanentError, TransientError
from ..core.registry import register

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]*(\.[A-Za-z_][A-Za-z0-9_$]*){0,2}$")


@register
class SnowflakeAdapter(Adapter):
    ID = "snowflake"
    TITLE = "Snowflake"
    PROTOCOL = "SQL API v2 POST /api/v2/statements (bindings), GET statementHandle?partition=n; key-pair JWT or OAuth"
    MOCK_NOTE = "Reproduces statement submission with bindings, the 202 async status, partition fetch and a MERGE result. Not a warehouse: SQL is not executed; it checks what the connector sends."
    CONNECTION = {"account_url": {"required": True, "description": "https://<account>.snowflakecomputing.com"}, "warehouse": {"required": True}, "database": {}, "schema": {}, "role": {}, "token_type": {"default": "KEYPAIR_JWT"}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"statement": {"required": True, "description": "SELECT with ? placeholders"}, "bindings": {}, "key_field": {"default": "ID"}, "event_time_field": {}, "poll_attempts": {"default": 20}}
    WRITE = {"table": {"required": True}, "key_column": {"required": True}, "columns": {"required": True}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.conn["headers"] = {**(self.conn.get("headers") or {}), "X-Snowflake-Authorization-Token-Type": self.conn.get("token_type", "KEYPAIR_JWT"), "User-Agent": "brainsiphon-fde-adapter/1.0"}
        self.http = self.build_http(self.conn["account_url"])
        self._cols: List[str] = []

    def _body(self, sql: str, bindings: Optional[List[Any]] = None) -> Dict[str, Any]:
        b: Dict[str, Any] = {"statement": sql, "timeout": 60}
        for k in ("warehouse", "database", "schema", "role"):
            if self.conn.get(k):
                b[k] = self.conn[k]
        if bindings:
            b["bindings"] = {str(i + 1): {"type": "TEXT" if isinstance(v, str) else "REAL" if isinstance(v, float) else "FIXED", "value": str(v)} for i, v in enumerate(bindings)}
        return b

    def _run(self, sql: str, bindings: Optional[List[Any]] = None, idem: Optional[str] = None) -> Dict[str, Any]:
        r = self.http.post("/api/v2/statements", json_body=self._body(sql, bindings), params={"requestId": idem} if idem else None, ok=(202,))
        d = r.json()
        for _ in range(int(self.cfg.get("read", {}).get("poll_attempts", 20))):
            if r.status == 200:
                return d
            r = self.http.get(d["statementStatusUrl"], ok=(202,))
            d = r.json()
        raise TransientError("statement did not finish within the polling budget")

    def _health(self) -> Health:
        d = self._run("SELECT CURRENT_VERSION()")
        return Health(True, {"statement_handle": d.get("statementHandle")})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[Tuple[str, int, int]]) -> Tuple[List[Dict[str, Any]], Optional[Tuple[str, int, int]]]:
        r = self.cfg["read"]
        if cursor is None:
            d = self._run(r["statement"], query.get("bindings", r.get("bindings")))
            meta = d["resultSetMetaData"]
            self._cols = [c["name"] for c in meta["rowType"]]
            parts = len(meta.get("partitionInfo", [1]))
            rows = d["data"]
            return [dict(zip(self._cols, x)) for x in rows], ((d["statementHandle"], 1, parts) if parts > 1 else None)
        handle, p, parts = cursor
        d = self.http.get(f"/api/v2/statements/{handle}", params={"partition": p}).json()
        return [dict(zip(self._cols, x)) for x in d["data"]], ((handle, p + 1, parts) if p + 1 < parts else None)

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        for ident in [w["table"], w["key_column"], *w["columns"]]:
            if not _IDENT.match(ident):
                raise ConfigError(f"'{ident}' is not a valid Snowflake identifier")
        cols = [w["key_column"], *[c for c in w["columns"] if c != w["key_column"]]]
        sql = (f"MERGE INTO {w['table']} t USING (SELECT {', '.join('? AS ' + c for c in cols)}) s ON t.{w['key_column']} = s.{w['key_column']} "
               f"WHEN MATCHED THEN UPDATE SET {', '.join(f't.{c} = s.{c}' for c in cols[1:])} "
               f"WHEN NOT MATCHED THEN INSERT ({', '.join(cols)}) VALUES ({', '.join('s.' + c for c in cols)})")
        d = self._run(sql, [payload.get(c) if c != w["key_column"] else (payload.get(c) or idem_key) for c in cols])
        ins = d["data"][0][0]
        return {"created": ins not in ("0", 0)}
