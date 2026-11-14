"""Oracle Database (12c+, including RAC and Autonomous): FETCH FIRST paging, MERGE INTO ... USING DUAL for the upsert."""
from __future__ import annotations

import os
from typing import Any, Tuple

from ..core.registry import register
from .sql_base import OracleDialect, SqlAdapter


@register
class OracleAdapter(SqlAdapter):
    ID = "oracle"
    TITLE = "Oracle Database"
    PROTOCOL = "Oracle Net (TNS) through python-oracledb in thin mode; service-name connection; TCPS when tls is true"
    DIALECT = OracleDialect()
    CONNECTION = {**SqlAdapter.CONNECTION, "service_name": {"description": "defaults to the database setting"}}
    MOCK_NOTE = "mock: true runs PostgreSQL-dialect SQL on SQLite. Oracle MERGE and FETCH FIRST generation is covered by unit tests on the SQL text only; no Oracle server is involved."

    def _drivers(self) -> Tuple[Any, str]:
        import oracledb  # type: ignore

        svc = self.conn.get("service_name") or self.conn["database"]
        proto = "tcps" if self.conn.get("tls", True) else "tcp"
        dsn = f"(DESCRIPTION=(ADDRESS=(PROTOCOL={proto})(HOST={self.conn['host']})(PORT={self.conn.get('port', 1521)}))(CONNECT_DATA=(SERVICE_NAME={svc})))"
        return oracledb.connect(user=os.environ.get(self.conn["user_env"], ""), password=os.environ.get(self.conn["password_env"], ""), dsn=dsn), "oracledb"
