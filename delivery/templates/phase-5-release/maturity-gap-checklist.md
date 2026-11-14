# Implementation Checklist: the work between maturity levels

> **Document ID:** `BS-TMPL-MAT-01`
> **Purpose:** the remaining work between "a reference implementation exists" and "this runs in production". Copy it per use case and per environment. The levels are the ones on the site's release report; none implies the one above it.
> **Honesty rule:** a box is ticked only with a link to evidence from *your* environment. Evidence from the BrainSiphon starter or reference implementation does not count past its own level.

| Level | Supplied by BrainSiphon | You must still do |
| --- | --- | --- |
| Prototype-ready | Starter or reference implementation, synthetic data | Run it; replace synthetic data |
| Evaluation-ready | Evaluation harness, thresholds | Real data, real labels, offline results |
| Shadow-ready | Serving skeleton, contracts, runbooks | Platform, integrations, monitoring, security approval |
| Production-ready | Deployment templates, handover template | Everything measured in your environment, independent validation, sign-offs |

## A. Prototype-ready → Evaluation-ready

- [ ] Real data access approved and a data snapshot ID recorded
- [ ] Data contract signed with each producing team (`delivery/templates/phase-1-design/05-open-data-contract-template.yaml`)
- [ ] Label definition agreed with the domain expert; label delay measured
- [ ] Leakage review done (time-based split, no future features)
- [ ] Baseline and candidate trained on real data with the same split; results on slices, not only the average
- [ ] Calibration checked where decisions use probabilities
- [ ] Model card and dataset card started
- [ ] Exit: candidate beats baseline on the agreed metric with a confidence interval, on real data

## B. Evaluation-ready → Shadow-ready

- [ ] Serving interface implemented against the real feature source (online/offline consistency test passes)
- [ ] Identity integrated (OIDC), roles mapped, tenant isolation tested
- [ ] Environments provisioned as code; `terraform validate`, policy checks and plan reviewed
- [ ] Observability: metrics, traces with correlation IDs, alerts routed to a named on-call
- [ ] Threat model done; security tests and dependency scan pass
- [ ] Load test at 2x expected peak; failure-injection test for each dependency
- [ ] Rollback rehearsed
- [ ] Independent model validation report signed (mandatory for high-risk tiers)
- [ ] Exit: system receives mirrored production traffic and produces decisions nobody acts on

## C. Shadow-ready → Production-ready

- [ ] Shadow results compared with the incumbent for the agreed period; discrepancies explained
- [ ] Canary plan with guardrail metrics and automatic rollback thresholds
- [ ] Restore-from-backup and failover tests run; **measured** RTO/RPO recorded next to targets
- [ ] Runbooks exercised in a game day; post-incident review template used
- [ ] Production handover package accepted (`production-handover-package.md`)
- [ ] Regulatory and risk sign-offs on file for your jurisdiction (this checklist is not legal advice)
- [ ] Exit: business and technical owners have signed; the first quarterly review is scheduled

## D. Evidence ledger

| Item | Level | Evidence link | Verified by | Date |
| --- | --- | --- | --- | --- |
