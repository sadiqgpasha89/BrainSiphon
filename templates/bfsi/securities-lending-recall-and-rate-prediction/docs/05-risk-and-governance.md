# Securities Lending Recall & Rate Prediction: risk and governance register

> Generated from the blueprint `bfsi/securities-lending-recall-and-rate-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Securities Lending Recall & Rate Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

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
| Evaluation trap: Survivorship in security lists. |  |  |  |  | open |
| Evaluation trap: Event dates known only after the fact. |  |  |  |  | open |
| Short squeeze: fees spike far beyond history. |  |  |  |  | open |
| Restricted securities: securities under borrowing restrictions are suggested for lending and the loan fails at the lender. |  |  |  |  | open |
| Short squeeze: fees spike far beyond history |  |  | Regime flag and cap on suggested pricing |  | open |
| Restricted securities: Securities under borrowing restrictions are suggested for lending and the loan fails at the lender |  |  | Check eligibility and beneficial-owner restrictions from compliance before any price suggestion is shown |  | open |
| Data delay: Utilisation data arrives late so the model works from yesterday's picture |  |  | Check the freshness of each feed and fall back to the last known value with a staleness flag |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Restricted: customer financial and credit data); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
| Consent and data-use rights | Record the lawful basis and permitted purposes per dataset; a use outside the recorded purpose fails the pipeline policy check | Purpose register and failed-check log |
| Residency and sovereignty | Pin regulated state by jurisdiction (RBI/IRDAI data-localisation and outsourcing rules, GDPR for EU customers, regulator-readable audit) | Region policy as code and a storage-location report |
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
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Model risk management (SR 11-7, SS1/23) | Model inventory, tiering, independent validation before promotion and periodic revalidation tracked in the registry | Validation report, inventory entry, annual review record | Model risk management | Annual and on material change |   |
| Fair lending and adverse-action explanation | Reason codes stored with each decision, protected-attribute proxies tested and a challenge process for declined customers | Disparate-impact report and a sampled adverse-action replay | Compliance | Quarterly |   |
| Risk-data aggregation and lineage (BCBS 239, IFRS 9, CECL) | Column-level lineage from source to model input to reported figure, with reconciled totals | Lineage graph and reconciliation sign-off | Risk data office | Quarterly |   |
| Operational resilience and third-party risk | Tested failover for the decision service, exit plans for external model providers and an outsourcing register entry | DR test report and vendor exit plan | Technology risk | Annual |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Short squeeze | Feature and score PSI against the calendar-matched baseline, and volume versus forecast. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Regime flag and cap on suggested pricing" does not fire. | Regime flag and cap on suggested pricing |
| Restricted securities | Frequency of the condition "restricted securities" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Check eligibility and beneficial-owner restrictions from co…" does not fire. | Check eligibility and beneficial-owner restrictions from compliance before any price suggestion is shown |
| Data delay | Label-maturity coverage, late-event share and the gap between proxy and matured metrics. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Check the freshness of each feed and fall back to the last…" does not fire. | Check the freshness of each feed and fall back to the last known value with a staleness flag |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
