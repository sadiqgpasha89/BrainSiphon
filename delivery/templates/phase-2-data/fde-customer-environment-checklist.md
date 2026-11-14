# Forward Deployed Engineer: Customer-Environment Implementation Checklist

> **Document ID:** `BS-TMPL-FDE-01`
> **Owner:** Forward Deployed Engineer (FDE). Delivery step 2.1 (access) and 5.4 (deploy).
> **Used with:** [`phase-gate-evidence-pack.md`](../phase-5-release/phase-gate-evidence-pack.md), [`production-handover-package.md`](../phase-5-release/production-handover-package.md)
> **Status of this file:** a blank template. Every tick must link to evidence (ticket, screenshot, command output). An unticked line is a blocker with a named owner and a date.

Customer: `[name]`  Environment: `[dev | staging | pre-production | production]`  Blueprint: `[slug]`  FDE: `[name]`

## 1. Who owns what on the customer side

| Concern | Customer owner (name) | Ticket | Status |
| --- | --- | --- | --- |
| Network and firewall change | | | |
| Identity provider and group mapping | | | |
| Source-system data access | | | |
| Cloud account / subscription / project | | | |
| Change advisory board (CAB) slot | | | |
| Security review and penetration-test window | | | |
| Production on-call (receiving team) | | | |

## 2. Network restrictions

- [ ] Outbound egress is allow-listed by FQDN or CIDR; the list is attached: `[link]`
- [ ] No direct internet egress from inference workloads (proxy or private endpoint only)
- [ ] Inbound traffic arrives only through the customer API gateway or load balancer
- [ ] Corporate TLS-inspection CA bundle is installed where the customer proxy re-signs traffic
- [ ] DNS: private zones resolve the model-serving, database and object-store endpoints
- [ ] Connectivity proof: `curl -sS -o /dev/null -w "%{http_code}\n" https://<endpoint>/health` returns `200` from inside the workload subnet. Output attached.

## 3. Private endpoints

- [ ] Object storage reached via private endpoint (AWS: S3 gateway/interface endpoint; Azure: Private Link; GCP: Private Service Connect)
- [ ] Managed database reached via private IP only; public access disabled
- [ ] Container registry reachable privately, or images mirrored into the customer registry
- [ ] LLM provider reached via the customer's approved route (private link, proxy or self-hosted); data-residency region confirmed

## 4. Identity federation

- [ ] Workforce SSO: OIDC/SAML federation to the customer IdP; test user can sign in
- [ ] Group-to-role mapping documented and approved by the customer security team
- [ ] Workload identity (IRSA / Azure Workload Identity / GKE Workload Identity), not static keys
- [ ] On-behalf-of token exchange tested for each downstream API the system calls
- [ ] Service accounts are least-privilege and have named owners; secrets are in the customer's secrets manager

## 5. API access to upstream and downstream systems

| System | Interface | Auth method | Rate limit agreed | Test credentials issued | Contract tested |
| --- | --- | --- | --- | --- | --- |
| `[source]` | `[REST / JDBC / Kafka / file drop]` | | | | |

## 6. Deployment permissions

- [ ] The deploy identity can create only the resources in the approved Terraform plan (permission boundary attached)
- [ ] `terraform plan` output was reviewed by the customer platform team and saved: `[link]`
- [ ] Image signatures are verified by the customer admission policy
- [ ] Rollback was rehearsed in the customer environment (not only in ours): `[link]`

## 7. Moving from prototype to the customer-controlled production environment

1. Freeze the prototype artifact (commit SHA, image digest, model version, data snapshot ID).
2. Rebuild the image inside the customer CI from source; compare the digest with the prototype's.
3. Re-run the contract, data-quality and model-regression tests against the customer's non-production data.
4. Deploy dark (no traffic) behind a feature flag; run the smoke test.
5. Run shadow traffic; compare with the incumbent decision for at least the period the blueprint specifies.
6. Canary under the customer's change ticket; widen only when the guardrail metrics hold.
7. Hand over using `production-handover-package.md`; record business and technical acceptance.

## 8. Adoption and production feedback

- [ ] Operators trained; attendance recorded
- [ ] Users trained on override and escalation; first-week questions logged
- [ ] Feedback channel agreed; weekly triage owner named
- [ ] First production feedback summary delivered to the product owner on `[date]`

## 9. Troubleshooting log (customer-side)

| Date | Symptom | Root cause | Fix | Owner | Time to resolve |
| --- | --- | --- | --- | --- | --- |
