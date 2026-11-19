# Listing Description Generation with Fair-Housing Checks: risk and governance register

> Generated from the blueprint `real-estate/listing-description-generation-with-fair-housing-checks` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Description Generation with Fair-Housing Checks · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: critical.** Critical risk because the output can deny, block, diagnose or price a person or an account; personal or customer data is processed; an agent can take actions through tools. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Strict approval boundaries, continuous assurance, human oversight where required and rehearsed fail-safe mechanisms.

**Approval path**

- Formal AI risk assessment and hazard or safety case before build
- Independent validation plus domain safety sign-off (clinical, regulatory or equivalent)
- Rehearsed manual fail-safe before go-live and a defined stop authority
- Continuous assurance reviewed monthly, with re-approval on any model or data change

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Training on past listings copies the biased language those listings contain. |  |  |  |  | open |
| Evaluation trap: Rules and enforcement change, so a checker that passed last year can fail now. |  |  |  |  | open |
| Missing facts: the property record is sparse and the model fills the gaps with invented features. |  |  |  |  | open |
| Local terms: fair-housing rules and terms differ by jurisdiction and a phrase is fine in one place and not another. |  |  |  |  | open |
| Missing facts: The property record is sparse and the model fills the gaps with invented features |  |  | Ask the agent for missing facts and refuse to describe features that are not in the record |  | open |
| Local terms: Fair-housing rules and terms differ by jurisdiction and a phrase is fine in one place and not another |  |  | Apply jurisdiction-specific rule sets and update them with the law |  | open |
| Coded language: Coded language and euphemisms steer buyers without using banned words |  |  | Keep updated phrase lists, use a classifier for steering and add examples from complaints |  | open |

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
| Risk classification | Tier assigned at intake (critical) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Independent validation before promotion and a scheduled revalidation | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Fair housing and anti-discrimination law | Protected-class features and close proxies excluded from features, disparate-impact tests in the release gate | Disparate-impact report per release | Compliance | Per release |   |
| Valuation standards and auditability | Store comparables, adjustments and model version with each valuation; human appraiser review above a value or uncertainty threshold | Valuation replay and reviewer sign-off sample | Valuation committee | Quarterly |   |
| Data licensing (MLS) and tenant privacy | Licence-aware access tiers, no redistribution of licensed fields and PII masking in analytics | Licence-policy tests and an access audit | Data governance | Quarterly |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Missing facts | Share of traffic in the cold-start segment and the primary metric on that segment alone. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Ask the agent for missing facts and refuse to describe feat…" does not fire. | Ask the agent for missing facts and refuse to describe features that are not in the record |
| Local terms | Primary error rate and selection rate by slice against the slice floors. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Apply jurisdiction-specific rule sets and update them with…" does not fire. | Apply jurisdiction-specific rule sets and update them with the law |
| Coded language | Frequency of the condition "coded language" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Keep updated phrase lists, use a classifier for steering an…" does not fire. | Keep updated phrase lists, use a classifier for steering and add examples from complaints |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
