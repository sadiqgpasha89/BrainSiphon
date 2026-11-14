# Environment readiness checklist

Work top to bottom with the customer. Each row names the template that captures the answer, the owner on the customer side,
and the `bs-preflight` section that proves it. A row is done when the **proof** passes, not when the answer is written down.

| # | Question | Template | Customer owner | Proof (`preflight.json` section) | Done |
|---|----------|----------|----------------|----------------------------------|------|
| 1 | What does the network look like end to end? | 01-enterprise-network-topology.md | Network architect | `tcp`, `proxy_checks` | |
| 2 | Which VPC/VNet/VPC network will it run in, and how does it reach the data? | 02-vpc-vnet-discovery.md | Cloud platform | `cloud_access`, `tcp` | |
| 3 | Which ports are open from where to where? | 03-firewall-port-requirements.csv | Firewall team | `tcp`, `egress_denied` | |
| 4 | Is there an egress proxy, and what does it allow? | 04-proxy-configuration.md | Network / security | `proxy_checks` | |
| 5 | Which names resolve, to which addresses, through which resolver? | 05-dns-private-endpoint-discovery.md | DNS team | `dns` | |
| 6 | Who authenticates people and machines? | 06-identity-provider-configuration.md | IAM | `idp`, `api_auth` | |
| 7 | Which service accounts, with which least-privilege permissions? | 07-service-account-requirements.csv | IAM / security | `service_accounts` | |
| 8 | Which databases, which accounts, which TLS settings? | 08-database-connectivity.md | DBA | `databases` | |
| 9 | Which topics, which principals, which advertised listeners? | 09-kafka-event-stream-access.md | Streaming platform | `kafka` | |
| 10 | Which API gateway routes, quotas and auth schemes? | 10-api-gateway-configuration.md | API platform | `http`, `api_auth`, `tls` | |
| 11 | Where do secrets live and how are they rotated? | 11-secrets-management.md | Security | `cloud_access` | |
| 12 | Where may data be stored and processed? | 12-data-residency-requirements.md | Privacy / legal | `dns`, `egress_denied` | |
| 13 | Which cloud accounts or subscriptions, and what access do we hold? | 13-cloud-subscription-account-access.md | Cloud platform | `cloud_access` | |

## How to use

1. Copy this folder to the customer's workspace repository and fill the templates with the customer.
2. Turn the answers into `preflight.json` (start from `config/preflight.example.json`; air-gapped sites start from
   `config/preflight.airgapped.example.json`).
3. Run `python3 -m bs_preflight run --config preflight.json --out readiness-report.json --markdown readiness-report.md`.
4. Attach `readiness-report.json` to the delivery workspace as evidence for the **Environment discovery** and **Integration
   discovery** stages. A `NOT_READY` report lists each blocking failure with its owner and the fix.
5. Re-run after every customer change, and again before the production rollout.
