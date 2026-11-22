# Healthcare Overtime & Premium Pay Prediction: risk and governance register

> Generated from the blueprint `healthcare/healthcare-overtime-premium-pay-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Overtime & Premium Pay Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: low.** Low risk because clinical domain where a regulator reads the model; batch output that a person consumes before any action. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Standard security, testing and operational controls.

**Approval path**

- Model owner approves promotion when the automated gates are green
- Security review through the standard SDLC checklist

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Using scheduled hours as the target. |  |  |  |  | open |
| Evaluation trap: Training on unsettled pay periods. |  |  |  |  | open |
| Retroactive pay adjustment: past periods change after the fact. |  |  |  |  | open |
| New collective agreement: pay rules change on a date. |  |  |  |  | open |
| Retroactive pay adjustment: past periods change after the fact |  |  | Restatement table with as-of dates and training on settled periods only |  | open |
| New collective agreement: pay rules change on a date |  |  | Rule table with effective dates and re-run of forecasts on the change date |  | open |
| Facility merger: cost centres combine |  |  | Mapping table with lineage and a series-continuity check |  | open |
| Agency contract change: rates and caps move |  |  | Contract register as a first-class input with effective dates |  | open |

## Data controls

| Area | Control | Evidence |
|---|---|---|
| Classification and privacy | Tag every dataset and feature with a classification (Restricted: identifiable clinical data (PHI)); enforce column-level access and mask in analyst views | Catalogue export showing classification coverage and a quarterly access review |
| Consent and data-use rights | Record the lawful basis and permitted purposes per dataset; a use outside the recorded purpose fails the pipeline policy check | Purpose register and failed-check log |
| Residency and sovereignty | Pin regulated state by jurisdiction (ABDM, HIPAA and GDPR: identifiable clinical data stays in the patient's jurisdiction) | Region policy as code and a storage-location report |
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
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Health-data protection (HIPAA, GDPR, ABDM) | Minimum-necessary access via relationship-based authorisation, field-level masking, jurisdiction-pinned storage and de-identified training sets | Access-audit sample, data-flow diagram and de-identification risk report | Privacy and security officer | Quarterly |   |
| Software-as-medical-device classification and clinical validation | Pre-registered validation protocol, locked model versions in production, change control for every retrain and a rollback plan | Validation study, locked-version manifest and change records | Clinical safety officer | Per release and annually |   |
| Clinical safety case and alert governance | Hazard log, alert hysteresis and burden caps, clinician override with a reason, and subgroup monitoring | Hazard log, alert-burden report and subgroup performance dashboard | Patient safety committee | Monthly |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Retroactive pay adjustment | Frequency of the condition "retroactive pay adjustment" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Restatement table with as-of dates and training on settled…" does not fire. | Restatement table with as-of dates and training on settled periods only |
| New collective agreement | Share of traffic in the cold-start segment and the primary metric on that segment alone. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Rule table with effective dates and re-run of forecasts on…" does not fire. | Rule table with effective dates and re-run of forecasts on the change date |
| Facility merger | Frequency of the condition "facility merger" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Mapping table with lineage and a series-continuity check" does not fire. | Mapping table with lineage and a series-continuity check |
| Agency contract change | Frequency of the condition "agency contract change" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Contract register as a first-class input with effective dat…" does not fire. | Contract register as a first-class input with effective dates |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
