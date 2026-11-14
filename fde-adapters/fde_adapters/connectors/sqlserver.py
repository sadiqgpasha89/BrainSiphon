"""Microsoft SQL Server (also Azure SQL, RDS SQL Server): OFFSET-free TOP paging, MERGE with HOLDLOCK for the upsert."""
from __future__ import annotations

import os
from typing import Any, Tuple

from ..core.registry import register
from .sql_base import SqlAdapter, SqlServerDialect


@register
class SqlServerAdapter(SqlAdapter):
    ID = "sqlserver"
    TITLE = "Microsoft SQL Server"
    PROTOCOL = "TDS through pyodbc and the Microsoft ODBC Driver 18; encryption on by default"
    DIALECT = SqlServerDialect()
    MOCK_NOTE = "mock: true runs PostgreSQL-dialect SQL on SQLite. T-SQL generation (TOP, MERGE ... HOLDLOCK) is covered by unit tests that assert the SQL text; it is not executed against SQL Server here."

    def _drivers(self) -> Tuple[Any, str]:
        import pyodbc  # type: ignore

        driver = self.conn.get("odbc_driver", "ODBC Driver 18 for SQL Server")
        dsn = (f"DRIVER={{{driver}}};SERVER={self.conn['host']},{self.conn.get('port', 1433)};DATABASE={self.conn['database']};"
               f"UID={os.environ.get(self.conn['user_env'], '')};PWD={os.environ.get(self.conn['password_env'], '')};Encrypt={'yes' if self.conn.get('tls', True) else 'no'};"
               f"TrustServerCertificate={'yes' if self.conn.get('trust_server_certificate') else 'no'}")
        return pyodbc.connect(dsn, timeout=int(self.conn.get("statement_timeout_seconds", 30))), "pyodbc"
