# Real-Time Card & UPI Fraud Detection: risk and governance register

> Generated from the blueprint `fintech/real-time-card-upi-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Card & UPI Fraud Detection · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** advanced

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: high.** High risk because the output can deny, block, diagnose or price a person or an account; financial domain where a regulator reads the model. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Formal risk assessment, independent validation, auditability and controlled deployment.

**Approval path**

- Formal AI risk assessment before build and before launch
- Independent validation by a team that did not build the model
- Risk owner and model-risk committee approve promotion; canary only
- Annual revalidation and re-approval on material change

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Selection bias in the labels: confirmed fraud comes only from cases the old model flagged or the customer reported, so a challenger trained on it learns to imitate the old model rather than to find what it missed. |  |  |  |  | open |
| Label delay: recent weeks look clean because chargebacks have not arrived, and a model trained on them treats this week's attack as genuine behaviour. |  |  |  |  | open |
| Flash sales and festive shopping spikes make ordinary customers look like a velocity burst, and a wave of false declines on the busiest day of the year is the most visible failure the business can have. |  |  |  |  | open |
| Mule-device rotation resets device fan-out to zero after every block, so a static device rule decays in days. |  |  |  |  | open |
| Flash-sale traffic spike: velocity features flag genuine buyers en masse |  |  | Per-merchant adaptive baselines plus an event-calendar feature |  | open |
| Issuer chargeback delay: labels mature 90 days later so recent data looks clean |  |  | Survival-aware label imputation and weekly refresh on matured windows |  | open |
| Genuine shopping session: four to nine purchases within minutes look like velocity |  |  | Per-card session baselines and step-up authentication between the review and block thresholds |  | open |
| Mule-device ring rotation: fraudsters rotate devices after a block so fan-out resets to zero |  |  | Cluster devices by shared payment tokens and IP ranges and carry risk across the cluster |  | open |
| UPI switch timeout with the feature store down: fail-closed breaches the false-decline ceiling immediately and fail-open invites burst attacks |  |  | Fall back to an in-memory L1 model on payload-resident features plus the Bloom-filter blocklist, and route mid-score cases to step-up |  | open |
| Split-leg UPI collect and pay: risk is scored on the collect leg but the pay leg arrives later with a changed device or amount |  |  | Carry a risk token with the transaction reference across legs and re-score on any material change |  | open |

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
| Risk classification | Tier assigned at intake (high) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Independent validation before promotion and a scheduled revalidation | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file and new-to-credit customers, first-time devices, small merchants; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| PCI-DSS scope minimisation | Tokenise PAN at the edge so the model plane, feature store and logs stay outside cardholder-data scope | Data-flow diagram with the scope boundary; quarterly scans; token-vault access logs | Security architecture | Quarterly and on any data-flow change |   |
| Payment-data localisation | Pin payment state to in-country shards with a synchronous in-country standby; cross-border calls carry tokens and derived features only | Region-pinning policy as code and a storage-location report | Platform engineering | Monthly |   |
| Explainable adverse decisions and dispute handling | Return reason codes with every decline or step-up, store them in the decision ledger and give analysts a logged override path | Ledger replay of a sampled disputed decision reproduces the output | Risk operations | Monthly sample |   |
| Model risk management for decision models | Independent validation before promotion, a model inventory entry and champion/challenger monitoring in production | Validation report, inventory record and the promotion approval trail | Model risk management | Annual review and on material change |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Flash-sale traffic spike | Feature and score PSI against the calendar-matched baseline, and volume versus forecast. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Per-merchant adaptive baselines plus an event-calendar feat…" does not fire. | Per-merchant adaptive baselines plus an event-calendar feature |
| Issuer chargeback delay | Label-maturity coverage, late-event share and the gap between proxy and matured metrics. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Survival-aware label imputation and weekly refresh on matur…" does not fire. | Survival-aware label imputation and weekly refresh on matured windows |
| Genuine shopping session | Frequency of the condition "genuine shopping session" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Per-card session baselines and step-up authentication betwe…" does not fire. | Per-card session baselines and step-up authentication between the review and block thresholds |
| Mule-device ring rotation | Probing and adversarial pattern rate, challenger disagreement and displacement to other channels. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Cluster devices by shared payment tokens and IP ranges and…" does not fire. | Cluster devices by shared payment tokens and IP ranges and carry risk across the cluster |
| UPI switch timeout with the feature store down | Dependency error and timeout rate, fallback level and share of decisions made on stale data. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Fall back to an in-memory L1 model on payload-resident feat…" does not fire. | Fall back to an in-memory L1 model on payload-resident features plus the Bloom-filter blocklist, and route mid-score cases to step-up |
| Split-leg UPI collect and pay | Frequency of the condition "split-leg upi collect and pay" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Carry a risk token with the transaction reference across le…" does not fire. | Carry a risk token with the transaction reference across legs and re-score on any material change |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
