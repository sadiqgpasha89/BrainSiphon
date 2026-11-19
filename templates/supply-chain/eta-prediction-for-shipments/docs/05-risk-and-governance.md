# Shipment ETA Prediction: risk and governance register

> Generated from the blueprint `supply-chain/eta-prediction-for-shipments` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shipment ETA Prediction · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: low.** Low risk because no direct decision about a person; internal optimisation with reversible effects. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Standard security, testing and operational controls.

**Approval path**

- Model owner approves promotion when the automated gates are green
- Security review through the standard SDLC checklist

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Evaluating only on delivered shipments. |  |  |  |  | open |
| Evaluation trap: Using the final scan in training features. |  |  |  |  | open |
| GPS gaps in tunnels or warehouses: eTA freezes or jumps. |  |  |  |  | open |
| Peak season hub overload: dwell distribution shifts within days. |  |  |  |  | open |
| GPS gaps in tunnels or warehouses: ETA freezes or jumps |  |  | Last-known state plus dead-reckoning confidence widening |  | open |
| Peak season hub overload: dwell distribution shifts within days |  |  | Rolling dwell quantiles and capacity features |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Confidential: commercial terms, demand and cost); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
| Consent and data-use rights | Record the lawful basis and permitted purposes per dataset; a use outside the recorded purpose fails the pipeline policy check | Purpose register and failed-check log |
| Residency and sovereignty | Region-pinned storage where contracts or law require; cross-border flows carry derived features, not raw records | Region policy as code and a storage-location report |
| Retention and deletion | Per-dataset retention, legal-hold support and key-based deletion that reaches features, embeddings, caches and training snapshots | Deletion-latency measurement and a retention-exception register |

## Model controls

| Area | Control | Evidence |
|---|---|---|
| Inventory and ownership | Every model, prompt set and index is a registry entry with a named owner and risk tier | Model inventory export; no production artifact without an entry |
| Risk classification | Tier assigned at intake (low) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Automated gates before promotion and a scheduled owner review | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new lanes, slow-moving SKUs and small carriers; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
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
| Partner data-sharing agreements | Contract terms encoded as data-use policies on shared datasets, with per-partner views and revocable access | Policy-as-code repository and partner access log | Supply chain legal and data office | Quarterly |   |
| Worker and driver data protection | Pseudonymise telematics identifiers, aggregate before analysis and restrict individual-level views | Pseudonymisation test and access audit | Privacy engineering | Quarterly |   |
| Trade, customs and traceability records | Immutable event log for custody and customs-relevant events with replay for audits | Audit replay of a sampled consignment | Logistics compliance | Semi-annual |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| GPS gaps in tunnels or warehouses | Frequency of the condition "gps gaps in tunnels or warehouses" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Last-known state plus dead-reckoning confidence widening" does not fire. | Last-known state plus dead-reckoning confidence widening |
| Peak season hub overload | Feature and score PSI against the calendar-matched baseline, and volume versus forecast. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Rolling dwell quantiles and capacity features" does not fire. | Rolling dwell quantiles and capacity features |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
