# Title & Deed Fraud Detection: risk and governance register

> Generated from the blueprint `real-estate/title-and-deed-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Title & Deed Fraud Detection · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

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
| Evaluation trap: Few labelled cases and many undetected ones make the recall unknowable. |  |  |  |  | open |
| Evaluation trap: Hidden fraud, since detected cases are those that were easy to detect. |  |  |  |  | open |
| Elderly owners: elderly owners are targeted by fraudsters and are often victims. |  |  |  |  | open |
| Estate sales: estate sales look unusual but are legitimate. |  |  |  |  | open |
| Elderly owners: Elderly owners are targeted by fraudsters and are often victims |  |  | Give protective alerts to owners flagged at higher risk and add review before recording |  | open |
| Estate sales: Estate sales look unusual but are legitimate |  |  | Add context about estates and avoid blocking on this alone |  | open |
| Cross-county: Fraud is spread across counties so no single registry sees the pattern |  |  | Link records across counties and share indicators |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Confidential: valuations, rent rolls and lease terms); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
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
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## AI security controls

| Threat | Control |
|---|---|
| Adversarial inputs that evade the model | Rate-limit and monitor probing, randomise thresholds near the boundary and keep rules and a challenger as a second opinion |
| Training-data poisoning | Provenance and signatures on datasets, label audits, outlier checks, matured-label-only training and a holdout the pipeline cannot write to |
| Model theft and extraction | Authenticate and rate-limit callers, return only the fields consumers need, audit high-volume querying and encrypt artifacts at rest |
| Insecure model supply chain | Sign and verify artifacts, pin and scan base models and dependencies, keep an ML bill of materials and refuse unsafe serialisation formats from untrusted sources |
| Agent privilege escalation | Typed least-privilege tools, on-behalf-of tokens for the calling user, approval for every write tool and a bounded budget of steps and cost |
| Leakage through features, logs and caches | Redact sensitive fields from logs and traces, scope caches by principal and exclude prohibited attributes from features |

## Regulatory obligations

| Obligation | Architectural control | Evidence | Owner | Cadence | Evidence link |
|---|---|---|---|---|---|
| Fair housing and anti-discrimination law | Protected-class features and close proxies excluded from features, disparate-impact tests in the release gate | Disparate-impact report per release | Compliance | Per release |   |
| Valuation standards and auditability | Store comparables, adjustments and model version with each valuation; human appraiser review above a value or uncertainty threshold | Valuation replay and reviewer sign-off sample | Valuation committee | Quarterly |   |
| Data licensing (MLS) and tenant privacy | Licence-aware access tiers, no redistribution of licensed fields and PII masking in analytics | Licence-policy tests and an access audit | Data governance | Quarterly |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Elderly owners | Probing and adversarial pattern rate, challenger disagreement and displacement to other channels. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Give protective alerts to owners flagged at higher risk and…" does not fire. | Give protective alerts to owners flagged at higher risk and add review before recording |
| Estate sales | Frequency of the condition "estate sales" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Add context about estates and avoid blocking on this alone" does not fire. | Add context about estates and avoid blocking on this alone |
| Cross-county | Frequency of the condition "cross-county" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Link records across counties and share indicators" does not fire. | Link records across counties and share indicators |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
