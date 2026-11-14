# Database connectivity

| Name | Engine and version | Role (system of record / feature store / warehouse) | Host and port | TLS mode | Auth method | Read-only account | Network path | Max connections we may use | DBA owner |
|------|--------------------|------------------------------------------------------|---------------|----------|-------------|-------------------|--------------|----------------------------|-----------|
| | PostgreSQL / SQL Server / Oracle / MySQL / Snowflake / Databricks | | | disable / require / verify-full | password / SCRAM / Kerberos / IAM / AAD | | direct / PrivateLink / VPN / bastion | | |

## Questions

- [ ] Is the replica read-only and how stale can it be? ______
- [ ] Which schemas and views may be read (never base tables with unmasked personal data)? ______
- [ ] Connection limits per account and the pooler in front (PgBouncer, RDS Proxy)? ______
- [ ] Is CDC allowed (logical replication slot / SQL Server CT / Oracle LogMiner / GoldenGate) and who operates it? ______
- [ ] Maintenance windows and failover behaviour (DNS flip, reconnect time)? ______
- [ ] Is a statement timeout enforced for our account? ______

## Proof

`databases[]` in `preflight.json`. PostgreSQL gets a real login and `SELECT 1` with no driver installed (cleartext, MD5 and
SCRAM-SHA-256). SQL Server and MySQL prove the protocol greeting and encryption setting; Oracle proves the TNS listener. An
installed driver (`pyodbc`, `oracledb`, `pymysql`) upgrades those to a real login.
