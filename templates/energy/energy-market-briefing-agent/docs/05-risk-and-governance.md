# Energy Market Briefing Agent: risk and governance register

> Generated from the blueprint `energy/energy-market-briefing-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Energy Market Briefing Agent · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: critical.** Critical risk because the output can deny, block, diagnose or price a person or an account; financial domain where a regulator reads the model; an agent can take consequential actions through tools in a regulated domain. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Strict approval boundaries, continuous assurance, human oversight where required and rehearsed fail-safe mechanisms.

**Approval path**

- Formal AI risk assessment and hazard or safety case before build
- Independent validation plus domain safety sign-off (clinical, regulatory or equivalent)
- Rehearsed manual fail-safe before go-live and a defined stop authority
- Continuous assurance reviewed monthly, with re-approval on any model or data change

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Model-computed figures. |  |  |  |  | open |
| Evaluation trap: Claims without sources. |  |  |  |  | open |
| Conflicting reports: two sources disagree. |  |  |  |  | open |
| Late notice: a notice appears after the briefing. |  |  |  |  | open |
| Conflicting reports: two sources disagree |  |  | Show both with reliability and flag the conflict |  | open |
| Late notice: a notice appears after the briefing |  |  | Update alert for affected positions |  | open |
| Data outage: a price feed is missing |  |  | State the gap and avoid filling it |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Restricted: grid topology, SCADA and critical infrastructure data); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
| Consent and data-use rights | Record the lawful basis and permitted purposes per dataset; a use outside the recorded purpose fails the pipeline policy check | Purpose register and failed-check log |
| Residency and sovereignty | Region-pinned storage where contracts or law require; cross-border flows carry derived features, not raw records | Region policy as code and a storage-location report |
| Retention and deletion | Per-dataset retention, legal-hold support and key-based deletion that reaches features, embeddings, caches and training snapshots | Deletion-latency measurement and a retention-exception register |

## Model controls

| Area | Control | Evidence |
|---|---|---|
| Inventory and ownership | Every model, prompt set and index is a registry entry with a named owner and risk tier | Model inventory export; no production artifact without an entry |
| Risk classification | Tier assigned at intake (critical) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Independent validation before promotion and a scheduled revalidation | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare fault types, new feeder configurations, extreme weather events and newly connected distributed generation; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## AI security controls

| Threat | Control |
|---|---|
| Prompt injection and jailbreaks | Treat retrieved and tool text as untrusted data, mark it, classify ingress and enforce a deterministic outbound policy engine |
| Training-data poisoning | Provenance and signatures on datasets, label audits, outlier checks, matured-label-only training and a holdout the pipeline cannot write to |
| Model theft and extraction | Authenticate and rate-limit callers, return only the fields consumers need, audit high-volume querying and encrypt artifacts at rest |
| Insecure model supply chain | Sign and verify artifacts, pin and scan base models and dependencies, keep an ML bill of materials and refuse unsafe serialisation formats from untrusted sources |
| Agent privilege escalation | Typed least-privilege tools, on-behalf-of tokens for the calling user, approval for every write tool and a bounded budget of steps and cost |
| Leakage through features, logs and caches | Redact sensitive fields from logs and traces, scope caches by principal and exclude prohibited attributes from features |

## Regulatory obligations

| Obligation | Architectural control | Evidence | Owner | Cadence | Evidence link |
|---|---|---|---|---|---|
| Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents) | Models have read-only access to operational data, no model output can issue a switching command and every control-zone connection is one-way and logged | Network segmentation diagram and access review | OT security | Quarterly |   |
| Reliability and service quality reporting (SAIDI, SAIFI and regulator rules) | Model-derived outage causes and times are labelled as estimates and reconciled to operator logs before reporting | Reconciliation report between model output and outage records | Regulatory affairs | Annual and per reporting period |   |
| Customer data protection and fair treatment of vulnerable customers | Consent and purpose limits on meter data, no automated disconnection decisions and support offers for customers in difficulty | Consent register and vulnerable customer policy audit | Customer operations and legal | Annual |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Conflicting reports | Frequency of the condition "conflicting reports" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Show both with reliability and flag the conflict" does not fire. | Show both with reliability and flag the conflict |
| Late notice | Label-maturity coverage, late-event share and the gap between proxy and matured metrics. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Update alert for affected positions" does not fire. | Update alert for affected positions |
| Data outage | Dependency error and timeout rate, fallback level and share of decisions made on stale data. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "State the gap and avoid filling it" does not fire. | State the gap and avoid filling it |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
