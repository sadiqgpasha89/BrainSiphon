"""PostgreSQL (also Aurora PostgreSQL, Cloud SQL, AlloyDB): keyset-paged read, INSERT ... ON CONFLICT upsert."""
from __future__ import annotations

import os
from typing import Any, Tuple

from ..core.registry import register
from .sql_base import PostgresDialect, SqlAdapter


@register
class PostgresAdapter(SqlAdapter):
    ID = "postgres"
    TITLE = "PostgreSQL"
    PROTOCOL = "PostgreSQL wire protocol through psycopg (3) or psycopg2; TLS; SCRAM-SHA-256"
    DIALECT = PostgresDialect()
    MOCK_NOTE = "mock: true runs the same SQL on SQLite (ON CONFLICT is supported there). Proves the connector's paging, binding and idempotency; does not prove PostgreSQL behaviour, permissions or pooling."

    def _drivers(self) -> Tuple[Any, str]:
        user, pw = os.environ.get(self.conn["user_env"], ""), os.environ.get(self.conn["password_env"], "")
        kw = dict(host=self.conn["host"], port=int(self.conn.get("port", 5432)), dbname=self.conn["database"], user=user, password=pw,
                  connect_timeout=int(self.conn.get("statement_timeout_seconds", 30)), sslmode="require" if self.conn.get("tls", True) else "prefer")
        try:
            import psycopg  # type: ignore

            return psycopg.connect(**{("dbname" if k == "dbname" else k): v for k, v in kw.items()}), "psycopg"
        except ImportError:
            import psycopg2  # type: ignore

            return psycopg2.connect(**kw), "psycopg2"
