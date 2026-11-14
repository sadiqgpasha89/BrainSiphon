"""Shared logic for the relational adapters (PostgreSQL, SQL Server, Oracle): keyset pagination, parameter binding, idempotent upsert.

Identifiers are validated, values are always bound parameters, and the dialect supplies the three things that differ:
the parameter style, how a page is limited, and how an upsert is written. With no driver installed (or `mock: true`) the adapter
runs the PostgreSQL-dialect SQL against SQLite, which is enough to test the connector's own logic but not the engine."""
from __future__ import annotations

import os
import re
import sqlite3
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError, PermanentError, TransientError

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_$#]*(\.[A-Za-z_][A-Za-z0-9_$#]*){0,2}$")


def ident(name: str) -> str:
    if not _IDENT.match(name):
        raise ConfigError(f"'{name}' is not a valid SQL identifier")
    return name


class Dialect:
    """Every dialect writes binds as :name; `SqlAdapter._named` converts them to what the driver wants (psycopg %(name)s, pyodbc ?)."""

    name = "ansi"

    def page_sql(self, select: str, key: str, size: int, has_cursor: bool) -> str:
        raise NotImplementedError

    def upsert_sql(self, table: str, key: str, cols: List[str]) -> str:
        raise NotImplementedError


class PostgresDialect(Dialect):
    name = "postgres"

    def page_sql(self, select: str, key: str, size: int, has_cursor: bool) -> str:
        return f"SELECT * FROM ({select}) q {'WHERE ' + key + ' > :cursor' if has_cursor else ''} ORDER BY {key} LIMIT {size}"

    def upsert_sql(self, table: str, key: str, cols: List[str]) -> str:
        ins = ", ".join(cols)
        vals = ", ".join(f":{c}" for c in cols)
        upd = ", ".join(f"{c} = EXCLUDED.{c}" for c in cols if c != key) or f"{key} = EXCLUDED.{key}"
        return f"INSERT INTO {table} ({ins}) VALUES ({vals}) ON CONFLICT ({key}) DO UPDATE SET {upd}"


class SqlServerDialect(Dialect):
    name = "sqlserver"

    def page_sql(self, select: str, key: str, size: int, has_cursor: bool) -> str:
        return f"SELECT TOP ({size}) * FROM ({select}) q {'WHERE ' + key + ' > :cursor' if has_cursor else ''} ORDER BY {key}"

    def upsert_sql(self, table: str, key: str, cols: List[str]) -> str:
        src = ", ".join(f":{c} AS {c}" for c in cols)
        upd = ", ".join(f"t.{c} = s.{c}" for c in cols if c != key)
        return (f"MERGE {table} WITH (HOLDLOCK) AS t USING (SELECT {src}) AS s ON t.{key} = s.{key} "
                f"WHEN MATCHED THEN UPDATE SET {upd} WHEN NOT MATCHED THEN INSERT ({', '.join(cols)}) VALUES ({', '.join('s.' + c for c in cols)});")


class OracleDialect(Dialect):
    name = "oracle"

    def page_sql(self, select: str, key: str, size: int, has_cursor: bool) -> str:
        return f"SELECT * FROM ({select}) q {'WHERE ' + key + ' > :cursor' if has_cursor else ''} ORDER BY {key} FETCH FIRST {size} ROWS ONLY"

    def upsert_sql(self, table: str, key: str, cols: List[str]) -> str:
        src = ", ".join(f":{c} AS {c}" for c in cols)
        upd = ", ".join(f"t.{c} = s.{c}" for c in cols if c != key)
        return (f"MERGE INTO {table} t USING (SELECT {src} FROM DUAL) s ON (t.{key} = s.{key}) "
                f"WHEN MATCHED THEN UPDATE SET {upd} WHEN NOT MATCHED THEN INSERT ({', '.join(cols)}) VALUES ({', '.join('s.' + c for c in cols)})")


class SqlAdapter(Adapter):
    DIALECT: Dialect = Dialect()
    CAPABILITIES = ("health", "read", "write")
    CONNECTION = {"host": {"required": True}, "port": {}, "database": {"required": True}, "user_env": {}, "password_env": {}, "tls": {"default": True}, "mock": {"default": False, "description": "run against an in-process SQLite database (PostgreSQL-dialect SQL) instead of the server"}, "mock_path": {"default": ":memory:"}, "statement_timeout_seconds": {"default": 30}}
    READ = {"query": {"required": True, "description": "a SELECT; named binds are written :name"}, "key_field": {"required": True, "description": "monotonic unique column used for keyset paging"}, "page_size": {"default": 1000}, "event_time_field": {}, "params": {}}
    WRITE = {"table": {"required": True}, "key_column": {"required": True}, "columns": {"required": True}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.mock = bool(self.conn.get("mock"))
        self._conn: Any = None
        self._driver = None

    # -- connection --------------------------------------------------------------------------------------------------------------
    def _drivers(self) -> Any:
        raise NotImplementedError

    def connect(self) -> Any:
        if self._conn is not None:
            return self._conn
        if self.mock:
            self._conn = sqlite3.connect(self.conn.get("mock_path", ":memory:"), check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
            self._driver = "sqlite3"
            return self._conn
        for k in ("user_env", "password_env"):
            if not self.conn.get(k) or not os.environ.get(self.conn[k]):
                raise ConfigError(f"connection.{k} must name an environment variable that is set (not needed with mock: true)")
        try:
            self._conn, self._driver = self._drivers()
        except ImportError as e:
            raise ConfigError(f"no database driver for {self.ID}: {e}. Install it from the customer's package mirror, or set connection.mock to true") from e
        except Exception as e:  # noqa: BLE001
            raise TransientError(f"cannot connect to {self.conn['host']}: {e}") from e
        return self._conn

    def close(self) -> None:
        if self._conn is not None:
            try:
                self._conn.close()
            finally:
                self._conn = None

    # -- SQL helpers -------------------------------------------------------------------------------------------------------------
    def _named(self, sql: str, params: Dict[str, Any]) -> Tuple[str, Any]:
        """Convert `:name` binds to the driver's style, keeping values out of the SQL text."""
        if self.mock or isinstance(self.DIALECT, OracleDialect):
            return sql, params  # SQLite and Oracle accept :name natively
        order: List[str] = []
        pg = isinstance(self.DIALECT, PostgresDialect)

        def sub(m: "re.Match[str]") -> str:
            order.append(m.group(1))
            return f"%({m.group(1)})s" if pg else "?"

        out = re.sub(r"(?<![:\w]):(\w+)", sub, sql)
        return (out, params) if pg else (out, tuple(params[n] for n in order))

    def _execute(self, sql: str, params: Optional[Dict[str, Any]] = None, fetch: bool = False) -> List[Dict[str, Any]]:
        conn = self.connect()
        sql, binds = self._named(sql, params or {})
        cur = conn.cursor()
        try:
            cur.execute(sql, binds)
            if fetch:
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, row)) for row in cur.fetchall()]
            conn.commit()
            return []
        except PermanentError:
            raise
        except Exception as e:  # noqa: BLE001
            try:
                conn.rollback()
            except Exception:  # noqa: BLE001
                pass
            msg = str(e).lower()
            if any(t in msg for t in ("deadlock", "timeout", "connection", "serialization", "could not serialize")):
                raise TransientError(f"{self.ID}: {e}") from e
            raise PermanentError(f"{self.ID}: {e}") from e

    def _page_sql(self, query: Dict[str, Any], has_cursor: bool) -> str:
        r = self.cfg["read"]
        return self.DIALECT.page_sql(r["query"].rstrip("; \n"), ident(r["key_field"]), int(r.get("page_size", 1000)), has_cursor)

    # -- adapter hooks -----------------------------------------------------------------------------------------------------------
    def _health(self) -> Health:
        rows = self._execute("SELECT 1 AS ok" + (" FROM DUAL" if isinstance(self.DIALECT, OracleDialect) else ""), fetch=True)
        return Health(bool(rows), {"driver": self._driver, "dialect": self.DIALECT.name})

    def _read_page(self, query: Dict[str, Any], cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        r = self.cfg["read"]
        params = dict(query.get("params") or r.get("params") or {})
        if cursor is not None:
            params["cursor"] = cursor
        rows = self._execute(self._page_sql(query, cursor is not None), params, fetch=True)
        size = int(r.get("page_size", 1000))
        key = r["key_field"]
        return rows, (rows[-1][key] if len(rows) == size else None)

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        table, key = ident(w["table"]), ident(w["key_column"])
        cols = [ident(c) for c in w["columns"]]
        if key not in cols:
            cols = [key, *cols]
        vals = {c: payload.get(c) for c in cols}
        if vals[key] is None:
            vals[key] = idem_key
        sql = PostgresDialect().upsert_sql(table, key, cols) if self.mock else self.DIALECT.upsert_sql(table, key, cols)
        self._execute(sql, vals)
        return {"key": vals[key]}
