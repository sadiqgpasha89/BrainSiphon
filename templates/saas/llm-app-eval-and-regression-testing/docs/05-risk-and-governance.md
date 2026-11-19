# LLM Application Evals & Regression Testing: risk and governance register

> Generated from the blueprint `saas/llm-app-eval-and-regression-testing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Application Evals & Regression Testing · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: high.** High risk because the output can deny, block, diagnose or price a person or an account; personal or customer data is processed. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Formal risk assessment, independent validation, auditability and controlled deployment.

**Approval path**

- Formal AI risk assessment before build and before launch
- Independent validation by a team that did not build the model
- Risk owner and model-risk committee approve promotion; canary only
- Annual revalidation and re-approval on material change

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Evaluating only on the tuned set. |  |  |  |  | open |
| Evaluation trap: Single aggregate metric. |  |  |  |  | open |
| Judge model update shifts scores: regressions appear or hide. |  |  |  |  | open |
| Dataset contamination via prompt tuning: optimistic scores. |  |  |  |  | open |
| Judge model update shifts scores: regressions appear or hide |  |  | Pinned judge versions and re-calibration |  | open |
| Dataset contamination via prompt tuning: optimistic scores |  |  | Held-out sets and rotation |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Confidential: tenant content and usage); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
| Consent and data-use rights | Record the lawful basis and permitted purposes per dataset; a use outside the recorded purpose fails the pipeline policy check | Purpose register and failed-check log |
| Residency and sovereignty | Region-pinned storage where contracts or law require; cross-border flows carry derived features, not raw records | Region policy as code and a storage-location report |
| Retention and deletion | Per-dataset retention, legal-hold support and key-based deletion that reaches features, embeddings, caches and training snapshots | Deletion-latency measurement and a retention-exception register |

## Model controls

| Area | Control | Evidence |
|---|---|---|
| Inventory and ownership | Every model, prompt set and index is a registry entry with a named owner and risk tier | Model inventory export; no production artifact without an entry |
| Risk classification | Tier assigned at intake (high) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Independent validation before promotion and a scheduled revalidation | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Retrieval-based data leakage | Apply permission filters inside the retrieval query before top-k, scope indexes and caches by tenant, and redact secrets before indexing |

## Regulatory obligations

| Obligation | Architectural control | Evidence | Owner | Cadence | Evidence link |
|---|---|---|---|---|---|
| Security attestations (SOC 2, ISO 27001) | Change control, access reviews and audit logging apply to prompts, indexes, tools and models like any production code | Control-test evidence from the compliance platform | Security and compliance | Continuous and annual audit |   |
| Customer data-processing agreements | Per-tenant data-use flags (no training, residency, subprocessors) enforced in the gateway and the retrieval layer | Gateway policy tests and a tenant-flag audit | Legal and trust | Quarterly |   |
| AI transparency commitments | Label AI output, cite sources and expose which model and policy version produced it | Sampled responses showing labels, citations and versions | Product | Per release |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Judge model update shifts scores | Feature and score PSI against the calendar-matched baseline, and volume versus forecast. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Pinned judge versions and re-calibration" does not fire. | Pinned judge versions and re-calibration |
| Dataset contamination via prompt tuning | Frequency of the condition "dataset contamination via prompt tuning" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Held-out sets and rotation" does not fire. | Held-out sets and rotation |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
