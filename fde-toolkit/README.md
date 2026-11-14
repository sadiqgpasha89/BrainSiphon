# FDE pre-flight assessment toolkit

What a Forward Deployed Engineer runs **before** designing against a customer's environment, and again before every rollout:
discovery templates, executable connectivity checks, and a machine-readable readiness report.

- **Standard library only.** It runs on a locked-down jump host with no package index and no internet access. Python 3.9 or later
  (3.13 tested), or, with no Python at all, `shell/preflight.sh` (bash, `timeout`, and `openssl`, `curl` or `getent` where used).
- **Restricted-network aware.** HTTP proxy with CONNECT, a customer CA bundle, `NO_PROXY` rules, private DNS resolvers, mTLS client
  certificates, and an **offline mode**. An air-gapped run also proves the negative: `egress_denied` passes only when a public
  destination is *not* reachable.
- **No secrets in files.** Configs name an environment variable (`client_secret_env`); a config that contains a credential is rejected.
  Secrets and tokens that were read are redacted from every report.

## Run it

```bash
cd fde-toolkit
cp config/preflight.example.json preflight.json          # or preflight.airgapped.example.json
export BS_SCORING_CLIENT_ID=... BS_SCORING_CLIENT_SECRET=... BS_DB_USER=... BS_DB_PASSWORD=...
python3 -m bs_preflight validate-config --config preflight.json
python3 -m bs_preflight run --config preflight.json \
    --out readiness-report.json --markdown readiness-report.md --junit readiness-report.xml
echo $?     # 0 READY, 1 NOT_READY, 2 configuration error, 3 READY_WITH_WARNINGS with --strict
```

No Python on the host:

```bash
printf 'dns\tgateway\tapi.internal.example\ntcp\tkafka\tkafka-1.internal.example\t9093\ntls\tgateway\tapi.internal.example\t443\n' > targets.tsv
BS_CUSTOMER=acme BS_ENVIRONMENT=staging bash shell/preflight.sh targets.tsv readiness-report.json
```

## What is checked

| Section | Check | What it proves |
|---------|-------|----------------|
| `dns` | system resolver, plus a hand-built UDP query to a named resolver | Name resolves, to the expected CIDR, via the expected CNAME chain (private endpoint), with a sane TTL |
| `tcp` | TCP connect, optionally through the proxy | The firewall rule exists. Timeout versus refused are told apart |
| `tls` | chain, hostname, **days to expiry**, protocol version, mTLS | Certificate is valid and not about to expire. An untrusted chain still reports its expiry |
| `http`, `api_auth` | reachability; bearer, API key, basic, OAuth2 client credentials, mTLS | Token is issued and accepted; **401 (identity) versus 403 (permission)** are separated; claims shown, token never |
| `idp` | OIDC discovery, issuer match, JWKS, grant types, clock skew; SAML metadata expiry | Tokens will validate; the host clock will not break them |
| `service_accounts` | allowed routes must pass, denied routes must fail | Least privilege is real, not assumed |
| `databases` | **PostgreSQL real login and `SELECT 1` without a driver** (cleartext, MD5, SCRAM-SHA-256); MySQL greeting; SQL Server TDS pre-login; Oracle TNS listener; optional driver login | Network path *and* credentials, and which one failed |
| `kafka` | ApiVersions, Metadata, topic existence, leaders, **reachability of every advertised listener** | The classic bootstrap-works-but-advertised-address-does-not failure |
| `object_storage` | SigV4-signed list, optional write/read/delete canary | S3-compatible storage (AWS, MinIO, Ceph, StorageGRID) is usable with this credential |
| `cloud_access` | allow-listed CLI commands (`aws`, `az`, `gcloud`, `kubectl`, `helm`, `terraform`, `docker`, `openssl`, `skopeo`, `crane`), no shell | The FDE's identity holds the permissions the delivery needs |
| `proxy_checks` | proxy reachable, CONNECT to each destination, NO_PROXY coverage | 403 (policy), 407 (credentials) and TLS interception are distinguished |
| `egress_denied` | connection must fail | The air gap is real |

## Report

`readiness-report.json` follows `schema/readiness-report.schema.json`. The verdict:

- `READY`: nothing failed or warned.
- `READY_WITH_WARNINGS`: only advisory findings (for example a certificate expiring in 14 days).
- `NOT_READY`: at least one **blocking** check failed. `summary.blocking_failures` lists their ids; each check carries
  `remediation` (what to ask for) and `owner_hint` (who on the customer side owns it).

Attach the report to the customer workspace as evidence for the *Environment discovery* and *Integration discovery* stages.

## Templates

`templates/` holds the thirteen discovery templates (network topology, VPC/VNet, firewall ports, proxy, DNS and private
endpoints, identity provider, service accounts, database connectivity, Kafka, API gateway, secrets management, data residency,
cloud account access) and `00-readiness-checklist.md`, which links each question to its template, its customer owner and the check that proves it.

## Restricted environments

See `OFFLINE.md`: moving the toolkit in, mirrors for packages and images, running with no internet, proving the air gap.

## Tests

```bash
python3 -m pytest tests -q      # 56 tests; local fake servers only (TLS, Kafka, PostgreSQL, DNS, proxy), no network
```

What the tests do not cover: a real PostgreSQL, Kafka, SQL Server or Oracle server (the wire-protocol code is exercised against
protocol-faithful fakes, and SCRAM-SHA-256 and SigV4 are checked against the published RFC and AWS vectors), and any real
customer network. Run it in the customer's environment: that is its purpose.
