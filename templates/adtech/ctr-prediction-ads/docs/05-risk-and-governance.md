# Ad Click-Through Rate Prediction: risk and governance register

> Generated from the blueprint `adtech/ctr-prediction-ads` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Click-Through Rate Prediction · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: medium.** Medium risk because personal or customer data is processed. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Additional data, privacy, fairness and human-review controls.

**Approval path**

- Model owner and product owner approve promotion on green gates and fairness-slice results
- Privacy review of data use and retention
- Security review of the model, prompts and tools

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| An embedding table is updated while serving, so a fraction of requests use the new version and the rest the old, and scores jump for that share of traffic. |  |  |  |  | open |
| A new creative format has no history, its CTR is underestimated, and it never receives exposure to correct that. |  |  |  |  | open |
| Accidental taps on mobile banners are counted as clicks, inflating CTR and rewarding misleading creatives. |  |  |  |  | open |
| A site redesign changes the placement mix and calibration drifts for one segment while the average still looks fine. |  |  |  |  | open |
| Embedding table updates mid-serving cause version skew: scores jump for a fraction of traffic |  |  | Versioned atomic embedding swaps with canary traffic |  | open |
| New creative format with no history: CTR underestimated and never gets exposure |  |  | Exploration budget and content-based priors |  | open |
| Accidental taps counted as clicks: mobile banner mis-taps inflate CTR and reward misleading creatives |  |  | Filter clicks with very short dwell time from labels and history |  | open |
| Traffic shift after a site redesign: placement mix changes and calibration drifts for a segment |  |  | Per-placement calibration refreshed hourly with an alarm on expected versus observed clicks |  | open |

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
| Risk classification | Tier assigned at intake (medium) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Automated gates before promotion and a scheduled owner review | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA) | Evaluate the consent string at the gateway; requests without consent use contextual features only | Consent-conformance test suite and sampled bid logs showing the gate | Privacy engineering | Quarterly |   |
| Sensitive-category and brand-safety policy | Blocklist and category policy evaluated before scoring, versioned with the decision | Policy version in decision logs and a violation-rate report | Trust and policy | Monthly |   |
| Billing accuracy and measurement integrity | Reconcile impressions, wins and spend against exchange reports with tolerance alerts; keep attribution method versioned | Daily reconciliation report and attribution method register | Finance operations | Daily and quarterly |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Embedding table updates mid-serving cause version skew | Frequency of the condition "embedding table updates mid-serving cause version skew" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Versioned atomic embedding swaps with canary traffic" does not fire. | Versioned atomic embedding swaps with canary traffic |
| New creative format with no history | Share of traffic in the cold-start segment and the primary metric on that segment alone. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Exploration budget and content-based priors" does not fire. | Exploration budget and content-based priors |
| Accidental taps counted as clicks | Frequency of the condition "accidental taps counted as clicks" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Filter clicks with very short dwell time from labels and hi…" does not fire. | Filter clicks with very short dwell time from labels and history |
| Traffic shift after a site redesign | Feature and score PSI against the calendar-matched baseline, and volume versus forecast. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Per-placement calibration refreshed hourly with an alarm on…" does not fire. | Per-placement calibration refreshed hourly with an alarm on expected versus observed clicks |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
