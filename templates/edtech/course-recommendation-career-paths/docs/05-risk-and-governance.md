# Course & Career Path Recommendation: risk and governance register

> Generated from the blueprint `edtech/course-recommendation-career-paths` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Course & Career Path Recommendation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

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
| Evaluation trap: Training on enrolments that reflect past recommendations. |  |  |  |  | open |
| Evaluation trap: Ignoring fairness drift. |  |  |  |  | open |
| Skills taxonomy changes: embeddings misaligned. |  |  |  |  | open |
| Gender-stereotyped recommendations: unfair career steering. |  |  |  |  | open |
| Skills taxonomy changes: embeddings misaligned |  |  | Taxonomy versioning and mapping |  | open |
| Gender-stereotyped recommendations: unfair career steering |  |  | Fairness audits and counterfactual testing |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Restricted: minors' records and assessment results); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
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
| Fairness and bias | Report performance and error rates by slice, including new learners, low-connectivity users and minority-language cohorts; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Student and child data protection (FERPA, COPPA, GDPR-K) | Per-institution data partitions, guardian-consent flags checked at read time and no cross-institution joins | Consent-gate tests and partition-isolation audit | Privacy officer | Quarterly |   |
| High-stakes assessment fairness and integrity | Human review for consequential outcomes, subgroup error-rate monitoring and a documented appeal process | Subgroup report and appeal log | Assessment board | Per term |   |
| Accessibility obligations (WCAG) | Accessible fallbacks for every AI-generated interaction and accessibility checks in the release gate | Accessibility test results per release | Product accessibility lead | Per release |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Skills taxonomy changes | Frequency of the condition "skills taxonomy changes" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Taxonomy versioning and mapping" does not fire. | Taxonomy versioning and mapping |
| Gender-stereotyped recommendations | Frequency of the condition "gender-stereotyped recommendations" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Fairness audits and counterfactual testing" does not fire. | Fairness audits and counterfactual testing |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
