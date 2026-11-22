# Provider Privilege & Scope-of-Practice Validation: risk and governance register

> Generated from the blueprint `healthcare/provider-privilege-scope-of-practice-validation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Privilege & Scope-of-Practice Validation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The risk register and control evidence for reviewers. The treatment follows the risk tier; the architecture supports these controls, and compliance is established by your own controls, evidence and assessment.

## Risk tier and treatment

**Tier: critical.** Critical risk because the output can deny, block, diagnose or price a person or an account; clinical domain where a regulator reads the model; patient safety depends on the output. The category is a default for this domain and consequence; the deployer must confirm it against the actual jurisdiction and use.

**Treatment.** Strict approval boundaries, continuous assurance, human oversight where required and rehearsed fail-safe mechanisms.

**Approval path**

- Formal AI risk assessment and hazard or safety case before build
- Independent validation plus domain safety sign-off (clinical, regulatory or equivalent)
- Rehearsed manual fail-safe before go-live and a defined stop authority
- Continuous assurance reviewed monthly, with re-approval on any model or data change

## Risk register

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Evaluation trap: Letting the ranker decide eligibility. |  |  |  |  | open |
| Evaluation trap: Evaluating without effective-date replay. |  |  |  |  | open |
| Bylaws amended mid-year: the old rule is applied. |  |  |  |  | open |
| Interim privileges: temporary scope is mistaken for permanent. |  |  |  |  | open |
| Bylaws amended mid-year: the old rule is applied |  |  | Versioned rules with effective dates and a rule-change replay |  | open |
| Interim privileges: temporary scope is mistaken for permanent |  |  | Explicit status in the graph and a time-bound check |  | open |
| Missing procedure code: the rule cannot be evaluated |  |  | Flag as incomplete data and route to the scheduler |  | open |
| Provider with multi-facility privileges: facility rules differ |  |  | Facility-scoped evaluation |  | open |

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
| Risk classification | Tier assigned at intake (critical) and reviewed on any change of use, data or autonomy | Intake record and tier change log |
| Documentation and approval | Model card (purpose, data, limits, slice results), intended-use statement and approvals attached to each version | Model card and approval trail in the registry |
| Validation and periodic review | Independent validation before promotion and a scheduled revalidation | Validation report and review minutes |
| Version and decision traceability | Each decision stores (feature-vector hash, model version, policy version, output) in an append-only ledger | Sampled ledger replay reproduces the output |

## Responsible AI controls

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
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
| Health-data protection (HIPAA, GDPR, ABDM) | Minimum-necessary access via relationship-based authorisation, field-level masking, jurisdiction-pinned storage and de-identified training sets | Access-audit sample, data-flow diagram and de-identification risk report | Privacy and security officer | Quarterly |   |
| Software-as-medical-device classification and clinical validation | Pre-registered validation protocol, locked model versions in production, change control for every retrain and a rollback plan | Validation study, locked-version manifest and change records | Clinical safety officer | Per release and annually |   |
| Clinical safety case and alert governance | Hazard log, alert hysteresis and burden caps, clinician override with a reason, and subgroup monitoring | Hazard log, alert-burden report and subgroup performance dashboard | Patient safety committee | Monthly |   |

## Edge cases and their monitors

| Scenario | Signal | Threshold | Response |
|---|---|---|---|
| Bylaws amended mid-year | Frequency of the condition "bylaws amended mid-year" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Versioned rules with effective dates and a rule-change repl…" does not fire. | Versioned rules with effective dates and a rule-change replay |
| Interim privileges | Frequency of the condition "interim privileges" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Explicit status in the graph and a time-bound check" does not fire. | Explicit status in the graph and a time-bound check |
| Missing procedure code | Null, schema-violation and duplicate rate on the affected inputs. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Flag as incomplete data and route to the scheduler" does not fire. | Flag as incomplete data and route to the scheduler |
| Provider with multi-facility privileges | Frequency of the condition "provider with multi-facility privileges" and the rate at which its mitigation fires. | Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "Facility-scoped evaluation" does not fire. | Facility-scoped evaluation |

## Decision on residual risk

Residual risks accepted by: ____________  Date: ________  Review on: ________
