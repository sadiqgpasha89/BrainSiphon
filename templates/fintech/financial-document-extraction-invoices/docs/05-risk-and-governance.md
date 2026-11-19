# Financial Document & Invoice Extraction: risk and governance register

> Generated from the blueprint `fintech/financial-document-extraction-invoices` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Financial Document & Invoice Extraction · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** foundational

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: medium.** Medium risk because financial domain where a regulator reads the model. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Additional data, privacy, fairness and human-review controls.

**Approval path**

- Model owner and product owner approve promotion on green gates and fairness-slice results
- Privacy review of data use and retention
- Security review of the model, prompts and tools

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Test set from the same vendors as train. |  |  |  |  | open |
| Evaluation trap: STP counted without downstream error audit. |  |  |  |  | open |
| Handwritten annotations over printed totals: totals mis-extracted. |  |  |  |  | open |
| Multi-currency invoice: wrong tax rule applied. |  |  |  |  | open |
| Handwritten annotations over printed totals: totals mis-extracted |  |  | Detect overwrites and route to human |  | open |
| Multi-currency invoice: wrong tax rule applied |  |  | Currency-aware validators and explicit currency field |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Restricted: PAN (tokenised) and account identifiers); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
| Consent and data-use rights | Record the lawful basis and permitted purposes per dataset; a use outside the recorded purpose fails the pipeline policy check | Purpose register and failed-check log |
| Residency and sovereignty | Pin regulated state by jurisdiction (RBI payment-data localisation (UPI and card data stored only in India), PCI-DSS scope) | Region policy as code and a storage-location report |
| Retention and deletion | Per-dataset retention, legal-hold support and key-based deletion that reaches features, embeddings, caches and training snapshots | Deletion-latency measurement and a retention-exception register |

## Model controls

| Area | Control | Evidence |
|---|---|---|
| Inventory and ownership | Every model, prompt set and index is a registry entry with a named owner and risk tier | Model inventory export; no production artifact without an entry |
| Risk classification | Tier assigned at intake (medium) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Automated gates before promotion and a scheduled owner review | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file and new-to-credit customers, first-time devices, small merchants; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| PCI-DSS scope minimisation | Tokenise PAN at the edge so the model plane, feature store and logs stay outside cardholder-data scope | Data-flow diagram with the scope boundary; quarterly scans; token-vault access logs | Security architecture | Quarterly and on any data-flow change |   |
| Payment-data localisation | Pin payment state to in-country shards with a synchronous in-country standby; cross-border calls carry tokens and derived features only | Region-pinning policy as code and a storage-location report | Platform engineering | Monthly |   |
| Explainable adverse decisions and dispute handling | Return reason codes with every decline or step-up, store them in the decision ledger and give analysts a logged override path | Ledger replay of a sampled disputed decision reproduces the output | Risk operations | Monthly sample |   |
| Model risk management for decision models | Independent validation before promotion, a model inventory entry and champion/challenger monitoring in production | Validation report, inventory record and the promotion approval trail | Model risk management | Annual review and on material change |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Handwritten annotations over printed totals | Frequency of the condition "handwritten annotations over printed totals" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Detect overwrites and route to human" does not fire. | Detect overwrites and route to human |
| Multi-currency invoice | Frequency of the condition "multi-currency invoice" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Currency-aware validators and explicit currency field" does not fire. | Currency-aware validators and explicit currency field |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
