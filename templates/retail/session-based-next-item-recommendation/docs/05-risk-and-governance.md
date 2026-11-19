# Session-Based Next-Item Recommendation: risk and governance register

> Generated from the blueprint `retail/session-based-next-item-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Session-Based Next-Item Recommendation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

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
| Bot traffic generates random or sequential-id sessions that pollute transition statistics and degrade recommendations for everyone. |  |  |  |  | open |
| A sale changes item popularity within minutes, and candidate sets built from yesterday's data become stale. |  |  |  |  | open |
| A session with a single click has no prefix to learn from, so a sequence model produces confident nonsense. |  |  |  |  | open |
| The top candidate is out of stock when displayed, shoppers bounce, and the model is blamed for it. |  |  |  |  | open |
| Bot traffic produces random sequences: random bot sequences pollute transition statistics and degrade recommendations |  |  | Bot filter and per-session anomaly flags |  | open |
| Sale event changes item popularity within minutes: stale candidate sets |  |  | Near-real-time popularity features and index refresh |  | open |
| Anonymous session with a single click: there is no prefix beyond one item |  |  | Fall back to category-level transitions plus popularity within the category |  | open |
| Out-of-stock item at the top of the list: the best candidate cannot be bought and shoppers bounce |  |  | Filter by live stock at re-rank time and backfill from the next candidates |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Confidential: customer behavioural and order data); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
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
| Fairness and bias | Report performance and error rates by slice, including cold-start users, long-tail sellers and new catalogue items; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Consumer privacy and consent (GDPR, CCPA, DPDP) | Consent flag read with every personalised request; opt-out routes to the non-personalised ranker; deletion fans out to feature store and embeddings | Consent-propagation test in CI and a deletion-latency report | Privacy engineering | Quarterly |   |
| Consumer protection and price transparency | Pricing and promotion rules sit in a versioned policy engine with floors, ceilings and an audit trail; the model proposes, the policy decides | Policy version attached to every price shown; sampled price audits | Pricing governance | Monthly |   |
| Marketplace fairness and seller transparency | Exposure and ranking-factor reports per seller cohort, with a documented override and appeal path | Cohort exposure dashboard and appeal log | Marketplace policy | Quarterly |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Bot traffic produces random sequences | Frequency of the condition "bot traffic produces random sequences" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Bot filter and per-session anomaly flags" does not fire. | Bot filter and per-session anomaly flags |
| Sale event changes item popularity within minutes | Dependency error and timeout rate, fallback level and share of decisions made on stale data. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Near-real-time popularity features and index refresh" does not fire. | Near-real-time popularity features and index refresh |
| Anonymous session with a single click | Frequency of the condition "anonymous session with a single click" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Fall back to category-level transitions plus popularity wit…" does not fire. | Fall back to category-level transitions plus popularity within the category |
| Out-of-stock item at the top of the list | Frequency of the condition "out-of-stock item at the top of the list" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Filter by live stock at re-rank time and backfill from the…" does not fire. | Filter by live stock at re-rank time and backfill from the next candidates |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
