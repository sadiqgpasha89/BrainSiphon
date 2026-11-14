# FDE adapter framework

A standard way to connect a solution to a customer's enterprise systems, with reusable adapters, configuration-driven
connectors and mocks, so an FDE does not build each integration from scratch.

```
external system  --(protocol)-->  adapter  --(mapping + contract)-->  internal record  --(write, idempotent)-->  target system
```

Standard library only (Python 3.9+). Optional drivers (`requirements-optional.txt`) are used when installed. Run from this folder:

```bash
python3 -m fde_adapters list                                    # adapters, protocols, what each mock does and does not do
python3 -m fde_adapters check --config configs/servicenow.connector.json --mock    # health + 3 mapped records, no access needed
python3 -m fde_adapters contract --config configs/salesforce.connector.json        # the standard contract battery against the mock
python3 -m pytest tests -q                                      # 63 tests
```

## The lifecycle every adapter follows

| Step | Method | Behaviour that is the same for every adapter |
|------|--------|-----------------------------------------------|
| configure | `registry.build(config)` | `${ENV}` expansion; **credentials only by environment-variable name** (`*_env`), a config holding a secret is rejected; unknown or missing settings are listed together |
| health | `healthcheck()` | never raises: returns `ok` with the reason code, status and request id |
| read | `read(query, limit, dead_letter)` | pages, maps each record, validates it against the output **contract**; a bad record goes to the dead-letter list instead of stopping the run |
| write | `write(records, key_fields)` | key derived from the **business fields** (never the clock); already-done keys are skipped; each failure carries a stable `code` |
| close | `close()` | commits offsets and acknowledgements, releases connections |

Behaviour shared through `fde_adapters.core`:

- **Errors** (`core/errors.py`): `AuthError` (401: identity team), `PermissionDenied` (403: system owner), `RateLimited` (honours `Retry-After`),
  `TransientError` / `TimeoutExceeded` (retried), `PermanentError` / `ContractError` (not retried, dead-lettered), `CircuitOpen`.
- **Retry** (`core/retry.py`): exponential backoff with full jitter, `Retry-After`, an overall `Deadline`, and a circuit breaker.
  A retry never sleeps past the deadline; a permanent error never retries.
- **HTTP** (`core/http.py`): OAuth2 client credentials with cached token and **one refresh on 401**, JWT-bearer (RS256, `cryptography` or the
  `openssl` CLI), basic, API key; proxy; private CA; request ids; redacted logs.
- **Idempotency** (`core/idempotency.py`): `derive_key(...)` and a SQLite-backed `IdempotencyStore` with a lease, so a crash mid-operation can be retried.
  Where the target supports it the write is *also* idempotent there (Salesforce external id, ServiceNow `correlation_id`, Dataverse alternate key,
  FHIR `If-None-Exist`, S3 `If-None-Match: *`, Kafka idempotent producer, SQL `ON CONFLICT` / `MERGE`).
- **Mapping** (`core/mapping.py`): declarative field mapping with paths, fallbacks, `to_utc` (including a source time zone and HL7 timestamps),
  unit conversion, lookup tables (code crosswalks), defaults and a per-record issue list. Unknown transforms fail when the connector is built.
- **Contract** (`core/contract.py`): a JSON Schema subset validator that needs no package, for contract tests on a locked-down host.

## Adapters

| id | System | Protocol | Verified against |
|----|--------|----------|------------------|
| `salesforce` | Salesforce | REST v60, SOQL paging, upsert by external id, JWT-bearer | vendor-shaped mock |
| `servicenow` | ServiceNow | Table API, paging, upsert by `correlation_id` | vendor-shaped mock |
| `dynamics365` | Dynamics 365 / Dataverse | OData v4, `@odata.nextLink`, alternate-key upsert, Entra ID | vendor-shaped mock |
| `sap-odata` | SAP S/4HANA, ECC | OData V2/V4, CSRF handshake with session cookie, check-then-create | vendor-shaped mock |
| `snowflake` | Snowflake | SQL API v2, bindings, async polling, partitions, `MERGE` | vendor-shaped mock (SQL not executed) |
| `databricks` | Databricks | SQL Statement Execution API, chunks, `MERGE INTO` | vendor-shaped mock (SQL not executed) |
| `postgres` | PostgreSQL | psycopg, keyset paging, `ON CONFLICT` | SQLite with the same SQL |
| `sqlserver` | SQL Server | pyodbc, `TOP`, `MERGE ... HOLDLOCK` | SQL text tests; SQLite for logic |
| `oracle` | Oracle | oracledb, `FETCH FIRST`, `MERGE ... USING DUAL` | SQL text tests; SQLite for logic |
| `kafka` | Kafka | consumer group, commit after processing, DLQ, idempotent producer | in-memory broker |
| `rabbitmq` | RabbitMQ | AMQP: manual ack, DLX, persistent publish | in-memory broker |
| `s3` | S3-compatible | SigV4 (AWS documentation vectors), paging, manifest-gated read, atomic publish | S3-shaped mock |
| `idp-oidc` | Enterprise IdP | OIDC discovery, JWKS rotation, RS256 validation, workforce vs machine, SCIM | local OIDC mock + openssl RSA keys |
| `hl7v2-mllp` | HL7 v2 | MLLP server and client, AA/AE/AR, duplicates, merges | the real MLLP code on localhost |
| `fhir-r4` | FHIR R4 | search paging, conditional create, OAuth2 | FHIR-shaped mock |

**What "verified" means here.** Every adapter passes its contract tests against a mock that reproduces the *documented request and
response shapes* of the endpoints it uses. That proves the connector's logic: paging, mapping, retries, idempotency, error handling.
It does **not** prove behaviour against the customer's real system, licences, permissions, field-level security, rate limits or data. No
adapter has been run against a vendor sandbox or a customer environment. Run `contract` and `check` against the customer's sandbox
first, and record the result in the connector compatibility registry (`content/connector-registry.json` in the site repository).

## Write a new adapter in an afternoon

1. Copy the closest adapter (REST: `servicenow.py`; database: `postgres.py`; broker: `kafka.py`).
2. Set `ID`, `TITLE`, `PROTOCOL`, `MOCK_NOTE` and the three `CONFIG_SPEC` dictionaries (`CONNECTION`, `READ`, `WRITE`).
3. Implement `_health`, `_read_page(query, cursor) -> (rows, next_cursor)` and `_write_one(payload, idem_key)`. Use `self.http`
   (retry, auth, errors are done for you) and raise the error classes; do not catch HTTP errors yourself.
4. Write `configs/<id>.connector.json`: connection, read, write, `mapping`, `write_mapping`, `contract`.
5. Add a mock route table to `mocks/vendors.py` for the endpoints you call, then run
   `run_contract_suite(...)` from `fde_adapters.testing`. It checks health, mapped reads, contract validity, a 503 burst, 429 with
   `Retry-After`, an idempotent write, and 403.
6. Add the adapter to `content/connector-registry.json` with the API version you built against.

## Configuration example

```json
{
  "adapter": "servicenow",
  "connection": { "instance_url": "${SN_INSTANCE_URL}", "auth": { "type": "basic", "user_env": "SN_USER", "password_env": "SN_PASSWORD" } },
  "read":  { "table": "incident", "query": "active=true", "page_size": 100, "key_field": "sys_id", "event_time_field": "sys_updated_on" },
  "write": { "table": "incident", "idempotency_fields": ["ticket_id"] },
  "mapping": { "fields": { "ticket_id": { "from": "number", "required": true },
                           "priority": { "from": "priority", "transform": ["map"], "map": { "1": "P1", "2": "P2" }, "default": "P3" },
                           "updated_at": { "from": "sys_updated_on", "transform": ["to_utc"] } } },
  "contract": { "type": "object", "required": ["ticket_id", "priority"], "properties": { "priority": { "enum": ["P1", "P2", "P3", "P4"] } } },
  "retry": { "max_attempts": 4 }, "timeouts": { "read": 30, "deadline": 60 }
}
```
