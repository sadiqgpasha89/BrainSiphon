# Production Handover Package

> **Document ID:** `BS-TMPL-HAND-01`
> **Owner:** Forward Deployed Engineer, with the SRE and the product owner. Delivery step 5.8, evidence for Gate 5.
> **Rule:** the handover is not accepted until every section links to evidence and the acceptance record in section 12 is signed by both a business and a technical owner.

System: `[name]`  Blueprint: `[slug]`  Release: `[version / commit / image digest]`  Date: `[YYYY-MM-DD]`

## 1. Architecture as deployed

- Diagram of what is actually running (not the proposed design): `[link]`; generated from `[terraform state / helm release / diagram source]`
- Differences from the blueprint and the reason for each: `[table]`
- Third-party services and their regions: `[table]`

## 2. Infrastructure inventory

| Resource | Cloud id | Environment | Owner | Cost centre | Backup | Terraform address |
| --- | --- | --- | --- | --- | --- | --- |

## 3. Service ownership

| Component | Owning team | Named owner | Escalation contact |
| --- | --- | --- | --- |
| Inference service | | | |
| Data pipelines | | | |
| Model and retraining | | | |
| Application / UI | | | |

## 4. SLIs and SLOs

| SLI | SLO | Measured by (query) | Error budget policy |
| --- | --- | --- | --- |
| Availability | `[e.g. 99.9% monthly]` | | |
| p99 latency | | | |
| Model quality (slice-level) | | | |
| Data freshness | | | |

State the **measured** values for the last 14 days next to the targets. Targets are not results.

## 5. On-call

- Rotation and schedule: `[link]`  Paging tool: `[name]`  Severity definitions: `[SEV1..SEV4]` with response times
- Dry-run page sent and acknowledged on `[date]`

## 6. Access and credential ownership transfer

| Credential / role | Held by (before) | Held by (after) | Rotated on | Evidence |
| --- | --- | --- | --- | --- |

All delivery-team break-glass access is removed or time-boxed: `[ticket]`

## 7. Outstanding risks and technical debt

| ID | Description | Severity | Owner | Due | Accepted by |
| --- | --- | --- | --- | --- | --- |

## 8. Known failure modes

| Failure | Detected by (alert) | Customer impact | Runbook |
| --- | --- | --- | --- |
| Feature store outage | | | |
| Stale data | | | |
| Corrupt model artifact | | | |
| Upstream schema change | | | |
| Provider outage (LLM) | | | |
| Regional failure | | | |

## 9. Recovery procedures

- Rollback command and the last rehearsal date and duration: `[link]`
- Restore-from-backup test: date, data set, achieved RPO and RTO (**measured**): `[link]`
- Failover test (if multi-region): date, achieved RTO (**measured**): `[link]`

## 10. Support and escalation

L1 / L2 / L3 contacts, hours, response targets, and when the delivery team is engaged again.

## 11. Training and knowledge transfer

| Audience | Session | Date | Attendees | Materials |
| --- | --- | --- | --- | --- |

## 12. Acceptance record

| | Name | Role | Decision (accept / accept with conditions / reject) | Date | Signature |
| --- | --- | --- | --- | --- | --- |
| Business | | Product owner | | | |
| Technical | | Operations / SRE lead | | | |
| Security | | Security engineer | | | |
| Compliance | | Risk and compliance | | | |

Conditions of acceptance and their deadlines: `[list]`
