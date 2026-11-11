# Data Access & Security Pre-Flight Checklist

**Document Code:** `BS-TMPL-SCOPE-07`  
**Phase:** Phase 0 — Scope & Discovery (Step 0.8)  

---

## Pre-Flight Verification Gate Before Phase 1 & 2 Commences

| Verification Item | Category | Verification Method | Status | Owner | Sign-off Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01. Data Governance Clearance** | Legal / Compliance | Written approval from Data Governance Officer for training usage | `[ ] PASS / [ ] FAIL` | Data Governance | `YYYY-MM-DD` |
| **02. PII / PHI Identification** | Privacy | Automated scan (Presidio / Cloud DLP) across historical tables | `[ ] PASS / [ ] FAIL` | InfoSec Lead | `YYYY-MM-DD` |
| **03. Read Access to Lakehouse** | IAM / Networking | Service account provisioned with read-only bucket / warehouse access | `[ ] PASS / [ ] FAIL` | Cloud IAM Admin | `YYYY-MM-DD` |
| **04. Live Stream Topic Access** | Networking | VPC peering / security group rules allowing consumer connection | `[ ] PASS / [ ] FAIL` | Network Admin | `YYYY-MM-DD` |
| **05. Test Environment Provisioning** | Infrastructure | Dedicated sandbox/dev AWS account or GCP project with isolated VPC | `[ ] PASS / [ ] FAIL` | Platform Lead | `YYYY-MM-DD` |
| **06. Synthetic Data Protocol** | Security | Scripted generator verified to leak 0 actual customer records | `[ ] PASS / [ ] FAIL` | ML Engineer | `YYYY-MM-DD` |
| **07. Secrets Management Store** | Infosec | AWS Secrets Manager / Vault path configured with RBAC policies | `[ ] PASS / [ ] FAIL` | DevSecOps | `YYYY-MM-DD` |
| **08. Data Retention Policy** | Compliance | Lifecycle rules defined for raw events (e.g. 90d) and WAL ledger (7y) | `[ ] PASS / [ ] FAIL` | Data Custodian | `YYYY-MM-DD` |
| **09. Model Card Sign-off Template** | Governance | Standard model card template approved by Risk Management | `[ ] PASS / [ ] FAIL` | Model Risk Lead | `YYYY-MM-DD` |
| **10. Exit Gate Clearance** | Executive | Sponsor and Lead Architect sign-off on discovery findings | `[ ] PASS / [ ] FAIL` | Delivery Lead | `YYYY-MM-DD` |

---

## Data Masking & Tokenization Guidelines
1. **Primary Account Numbers (PAN):** Must never enter the ML lakehouse unhashed. Tokenize with HMAC-SHA256 using a KMS-managed rotating key.
2. **IP Addresses & Geolocation:** Truncate IP addresses to `/24` CIDR blocks for IPv4 to eliminate individual host tracking while preserving regional fraud clustering.
3. **Names, Emails, Physical Addresses:** Strip out entirely unless essential for deterministic entity matching; if required, use cryptographic one-way salted hashes.

