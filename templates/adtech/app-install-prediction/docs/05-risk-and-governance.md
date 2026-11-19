# Mobile App Install & Post-Install Prediction: risk and governance register

> Generated from the blueprint `adtech/app-install-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mobile App Install & Post-Install Prediction · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

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
| Evaluation trap: Training on installs from fraudulent sources. |  |  |  |  | open |
| Evaluation trap: Delayed postbacks excluded. |  |  |  |  | open |
| Install-attribution partner changes postback schema: a schema change in postbacks silently breaks label joins and corrupts training data. |  |  |  |  | open |
| Click-injection fraud inflates installs: wrong sources look great. |  |  |  |  | open |
| Install-attribution partner changes postback schema: a schema change in postbacks silently breaks label joins and corrupts training data |  |  | Schema validation and monitoring |  | open |
| Click-injection fraud inflates installs: wrong sources look great |  |  | Time-to-install anomaly features |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Confidential: user identifiers and behavioural segments); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
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
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA) | Evaluate the consent string at the gateway; requests without consent use contextual features only | Consent-conformance test suite and sampled bid logs showing the gate | Privacy engineering | Quarterly |   |
| Sensitive-category and brand-safety policy | Blocklist and category policy evaluated before scoring, versioned with the decision | Policy version in decision logs and a violation-rate report | Trust and policy | Monthly |   |
| Billing accuracy and measurement integrity | Reconcile impressions, wins and spend against exchange reports with tolerance alerts; keep attribution method versioned | Daily reconciliation report and attribution method register | Finance operations | Daily and quarterly |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Install-attribution partner changes postback schema | Label-maturity coverage, late-event share and the gap between proxy and matured metrics. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Schema validation and monitoring" does not fire. | Schema validation and monitoring |
| Click-injection fraud inflates installs | Probing and adversarial pattern rate, challenger disagreement and displacement to other channels. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Time-to-install anomaly features" does not fire. | Time-to-install anomaly features |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
