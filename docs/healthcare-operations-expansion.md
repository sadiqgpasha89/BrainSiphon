# Healthcare operations expansion: register of the 75 added use cases

The healthcare domain grew from 50 to 125 blueprints (BrainSiphon now holds 575). The 75 additions cover healthcare *operations*: workforce, provider lifecycle, quality and safety, vendor and facility access, procurement, contracts, regulatory compliance, physician scheduling, clinical communications and payer and provider networks. They are vendor-neutral; no vendor copy, branding or product claim is used.

Source of truth: `content/usecases/healthcare.3.uc` to `healthcare.8.uc` (use cases 51 to 125, in authored order). Everything else (blueprints, playbooks, the worked templates under `templates/healthcare/`, `catalog.json`, `INDEX.md`, `public-catalog.json`, `data/blueprints.json.gz`) is generated from them with the repository's own commands.

## What every addition follows

- The existing typed blueprint model and generators; there is no parallel format.
- Rules first. Deterministic checks (emergency rules, notice dates, minimum coverage, equivalence registers, configuration checks) sit above any model, and the model may only add a lead, never remove one.
- A named human decides before anything changes: counsel for legal meaning, compliance owners for applicability and attestation, clinical value analysis for substitutions, scheduling committees for schedules, data stewards for merges, clinical operations for contingency actions. Nothing is sent, published, suppressed, merged or held automatically.
- Privacy limits are stated per use case: aggregation for people analytics, no scoring of individual staff or providers for punitive use, licensed data only, access-controlled provider and schedule data.
- Worked templates run on **synthetic data**. Their results show that the starter code runs and what it produces on made-up records. They are not evidence of production performance, clinical validity or legal compliance.

## The 75 use cases

### Workforce Intelligence (10)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 51 | [Healthcare Workforce Demand Forecasting by Unit](../templates/healthcare/healthcare-workforce-demand-forecasting-by-unit/README.md) | forecast | forecasting | adaptable |
| 52 | [Staffing Coverage Gap Prediction](../templates/healthcare/staffing-coverage-gap-prediction/README.md) | tabular | binary-event-classification | exact |
| 53 | [Float Pool & Cross-Department Staff Allocation](../templates/healthcare/float-pool-cross-department-staff-allocation/README.md) | optimize | optimisation-allocation | adaptable |
| 54 | [Healthcare Overtime & Premium Pay Prediction](../templates/healthcare/healthcare-overtime-premium-pay-prediction/README.md) | forecast | forecasting | adaptable |
| 55 | [Workforce Productivity & FTE Leakage Detection](../templates/healthcare/workforce-productivity-fte-leakage-detection/README.md) | anomaly | time-series-anomaly-detection | adaptable |
| 56 | [Schedule vs Actual Time Discrepancy Detection](../templates/healthcare/schedule-actual-time-discrepancy-detection/README.md) | anomaly | time-series-anomaly-detection | adaptable |
| 57 | [Healthcare Shift Incentive Optimization](../templates/healthcare/healthcare-shift-incentive-optimization/README.md) | optimize | optimisation-allocation | adaptable |
| 58 | [Healthcare Workforce Burnout & Attrition Early Warning](../templates/healthcare/healthcare-workforce-burnout-attrition-early-warning/README.md) | tabular | survival-time-to-event | none |
| 59 | [Healthcare Workforce Skill-Mix Optimization](../templates/healthcare/healthcare-workforce-skill-mix-optimization/README.md) | optimize | optimisation-allocation | adaptable |
| 60 | [Healthcare Workforce Absence & Sick Leave Forecasting](../templates/healthcare/healthcare-workforce-absence-sick-leave-forecasting/README.md) | forecast | forecasting | adaptable |

### Provider Lifecycle Intelligence (8)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 61 | [Provider Credentialing Document Intelligence](../templates/healthcare/provider-credentialing-document-intelligence/README.md) | nlp | information-extraction | adaptable |
| 62 | [Provider Credential Expiration & Renewal Prediction](../templates/healthcare/provider-credential-expiration-renewal-prediction/README.md) | tabular | survival-time-to-event | none |
| 63 | [Provider Enrollment Delay Prediction](../templates/healthcare/provider-enrollment-delay-prediction/README.md) | tabular | survival-time-to-event | none |
| 64 | [Provider Onboarding Cycle-Time Optimization](../templates/healthcare/provider-onboarding-cycle-time-optimization/README.md) | optimize | optimisation-allocation | adaptable |
| 65 | [Provider Data Quality & Entity Resolution](../templates/healthcare/provider-data-quality-entity-resolution/README.md) | graph | entity-resolution | adaptable |
| 66 | [Provider Privilege & Scope-of-Practice Validation](../templates/healthcare/provider-privilege-scope-of-practice-validation/README.md) | graph | binary-event-classification | adaptable |
| 67 | [Provider Recredentialing Automation](../templates/healthcare/provider-recredentialing-automation/README.md) | llm-agent | agentic-read-only | adaptable |
| 68 | [Provider Directory Accuracy Prediction](../templates/healthcare/provider-directory-accuracy-prediction/README.md) | tabular | binary-event-classification | exact |

### Quality, Safety & Performance Intelligence (8)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 69 | [Hospital Quality Measure Performance Forecasting](../templates/healthcare/hospital-quality-measure-performance-forecasting/README.md) | forecast | forecasting | adaptable |
| 70 | [CMS Quality Program Penalty Forecasting](../templates/healthcare/cms-quality-program-penalty-forecasting/README.md) | tabular | regression-estimation | adaptable |
| 71 | [Patient Safety Incident Prioritization](../templates/healthcare/patient-safety-incident-prioritization/README.md) | nlp | text-classification | adaptable |
| 72 | [Patient Safety Event Root-Cause Discovery](../templates/healthcare/patient-safety-event-root-cause-discovery/README.md) | graph | graph-analytics | adaptable |
| 73 | [Regulatory Quality Measure Gap Detection](../templates/healthcare/regulatory-quality-measure-gap-detection/README.md) | llm-rag | grounded-qa | exact |
| 74 | [Corrective Action & CAPA Effectiveness Prediction](../templates/healthcare/corrective-action-capa-effectiveness-prediction/README.md) | tabular | survival-time-to-event | none |
| 75 | [Clinical Quality Performance Anomaly Detection](../templates/healthcare/clinical-quality-performance-anomaly-detection/README.md) | anomaly | time-series-anomaly-detection | adaptable |
| 76 | [Quality Improvement Initiative Prioritization](../templates/healthcare/quality-improvement-initiative-prioritization/README.md) | optimize | optimisation-allocation | adaptable |

### Vendor & Facility Access Intelligence (6)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 77 | [Vendor Credential Compliance Risk Scoring](../templates/healthcare/vendor-credential-compliance-risk-scoring/README.md) | nlp | binary-event-classification | exact |
| 78 | [Vendor Access Risk Prediction](../templates/healthcare/vendor-access-risk-prediction/README.md) | anomaly | time-series-anomaly-detection | adaptable |
| 79 | [Vendor Visit Demand Forecasting](../templates/healthcare/vendor-visit-demand-forecasting/README.md) | forecast | forecasting | adaptable |
| 80 | [Vendor Access Policy Violation Detection](../templates/healthcare/vendor-access-policy-violation-detection/README.md) | anomaly | time-series-anomaly-detection | adaptable |
| 81 | [Vendor Compliance Document Intelligence](../templates/healthcare/vendor-compliance-document-intelligence/README.md) | nlp | information-extraction | adaptable |
| 82 | [Facility Access Pattern Anomaly Detection](../templates/healthcare/facility-access-pattern-anomaly-detection/README.md) | anomaly | time-series-anomaly-detection | adaptable |

### Procurement & Spend Intelligence (8)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 83 | [Healthcare Procurement Spend Anomaly Detection](../templates/healthcare/healthcare-procurement-spend-anomaly-detection/README.md) | anomaly | time-series-anomaly-detection | exact |
| 84 | [Contract vs Purchase Order Compliance Detection](../templates/healthcare/contract-purchase-order-compliance-detection/README.md) | nlp | information-extraction | adaptable |
| 85 | [Healthcare Supplier Performance & Risk Scoring](../templates/healthcare/healthcare-supplier-performance-risk-scoring/README.md) | tabular | binary-event-classification | exact |
| 86 | [Healthcare Contract-Based Price Variance Detection](../templates/healthcare/healthcare-contract-price-variance-detection/README.md) | nlp | binary-event-classification | adaptable |
| 87 | [Healthcare Spend Category Optimization](../templates/healthcare/healthcare-spend-category-optimization/README.md) | optimize | optimisation-allocation | adaptable |
| 88 | [Healthcare Purchase Demand Consolidation Optimization](../templates/healthcare/healthcare-purchase-demand-consolidation-optimization/README.md) | optimize | optimisation-allocation | adaptable |
| 89 | [Healthcare Vendor Substitution Recommendation](../templates/healthcare/healthcare-vendor-substitution-recommendation/README.md) | recommender | personalised-ranking | adaptable |
| 90 | [Healthcare Value Analysis Committee Decision Intelligence](../templates/healthcare/healthcare-value-analysis-committee-decision-intelligence/README.md) | llm-rag | grounded-qa | exact |

### Contract & Legal Intelligence (8)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 91 | [Healthcare Contract Clause Risk Classification](../templates/healthcare/healthcare-contract-clause-risk-classification/README.md) | nlp | text-classification | adaptable |
| 92 | [Healthcare Contract Obligation & Deadline Intelligence](../templates/healthcare/healthcare-contract-obligation-deadline-intelligence/README.md) | llm-agent | agentic-read-only | adaptable |
| 93 | [Healthcare Contract Renewal & Termination Risk Prediction](../templates/healthcare/healthcare-contract-renewal-termination-risk-prediction/README.md) | tabular | survival-time-to-event | none |
| 94 | [Healthcare Contract Compliance Monitoring](../templates/healthcare/healthcare-contract-compliance-monitoring/README.md) | llm-agent | agentic-read-only | adaptable |
| 95 | [Healthcare Contract Negotiation Intelligence](../templates/healthcare/healthcare-contract-negotiation-intelligence/README.md) | llm-agent | agentic-read-only | adaptable |
| 96 | [Healthcare Contract Price & Terms Benchmarking](../templates/healthcare/healthcare-contract-price-terms-benchmarking/README.md) | nlp | regression-estimation | adaptable |
| 97 | [Healthcare Contract Redlining Copilot](../templates/healthcare/healthcare-contract-redlining-copilot/README.md) | llm-agent | agentic-read-only | adaptable |
| 98 | [Healthcare Contract Portfolio Risk Prioritization](../templates/healthcare/healthcare-contract-portfolio-risk-prioritization/README.md) | tabular | binary-event-classification | adaptable |

### Regulatory Compliance Intelligence (8)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 99 | [Healthcare Regulatory Change Intelligence](../templates/healthcare/healthcare-regulatory-change-intelligence/README.md) | llm-rag | grounded-qa | adaptable |
| 100 | [Healthcare Regulatory Change Impact Assessment](../templates/healthcare/healthcare-regulatory-change-impact-assessment/README.md) | llm-agent | agentic-read-only | adaptable |
| 101 | [Healthcare Compliance Evidence Collection Automation](../templates/healthcare/healthcare-compliance-evidence-collection-automation/README.md) | llm-agent | agentic-read-only | adaptable |
| 102 | [Healthcare Compliance Control Effectiveness Prediction](../templates/healthcare/healthcare-compliance-control-effectiveness-prediction/README.md) | tabular | survival-time-to-event | none |
| 103 | [Healthcare Compliance Obligation Mapping](../templates/healthcare/healthcare-compliance-obligation-mapping/README.md) | graph | binary-event-classification | adaptable |
| 104 | [Healthcare Audit Readiness Prediction](../templates/healthcare/healthcare-audit-readiness-prediction/README.md) | tabular | regression-estimation | adaptable |
| 105 | [Healthcare Compliance Remediation Prioritization](../templates/healthcare/healthcare-compliance-remediation-prioritization/README.md) | bandit | binary-event-classification | adaptable |
| 106 | [Healthcare Compliance Policy Drift Detection](../templates/healthcare/healthcare-compliance-policy-drift-detection/README.md) | nlp | text-classification | adaptable |

### Physician Scheduling & Coverage Intelligence (6)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 107 | [Physician Demand & Coverage Forecasting](../templates/healthcare/physician-demand-coverage-forecasting/README.md) | forecast | forecasting | adaptable |
| 108 | [Physician On-Call & Call-Rotation Optimization](../templates/healthcare/physician-on-call-rotation-optimization/README.md) | optimize | optimisation-allocation | adaptable |
| 109 | [Physician Availability & Schedule Conflict Detection](../templates/healthcare/physician-availability-schedule-conflict-detection/README.md) | anomaly | time-series-anomaly-detection | adaptable |
| 110 | [Specialty Coverage Risk Prediction](../templates/healthcare/specialty-coverage-risk-prediction/README.md) | tabular | binary-event-classification | exact |
| 111 | [Physician Schedule Fairness Analytics](../templates/healthcare/physician-schedule-fairness-analytics/README.md) | tabular | binary-event-classification | adaptable |
| 112 | [Physician Schedule Preference Optimization](../templates/healthcare/physician-schedule-preference-optimization/README.md) | optimize | optimisation-allocation | adaptable |

### Clinical Communications & Coordination (6)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 113 | [Clinical Communication Urgency Classification](../templates/healthcare/clinical-communication-urgency-classification/README.md) | nlp | text-classification | adaptable |
| 114 | [Care-Team Message Routing & Escalation](../templates/healthcare/care-team-message-routing-escalation/README.md) | nlp | text-classification | adaptable |
| 115 | [Clinical Communication Delay & Escalation Risk Prediction](../templates/healthcare/clinical-communication-delay-escalation-risk-prediction/README.md) | tabular | survival-time-to-event | none |
| 116 | [Care-Team Coordination Bottleneck Detection](../templates/healthcare/care-team-coordination-bottleneck-detection/README.md) | anomaly | time-series-anomaly-detection | adaptable |
| 117 | [Clinical Handoff Quality Assessment](../templates/healthcare/clinical-handoff-quality-assessment/README.md) | nlp | information-extraction | adaptable |
| 118 | [Clinical Communication Workload Optimization](../templates/healthcare/clinical-communication-workload-optimization/README.md) | optimize | optimisation-allocation | adaptable |

### Payer & Provider Network Intelligence (7)

| # | Use case | Pattern | Problem type | Reference-kit verdict |
|---|---|---|---|---|
| 119 | [Provider Network Adequacy Prediction](../templates/healthcare/provider-network-adequacy-prediction/README.md) | tabular | binary-event-classification | adaptable |
| 120 | [Provider Network Gap Identification](../templates/healthcare/provider-network-gap-identification/README.md) | tabular | clustering-segmentation | none |
| 121 | [Provider Directory Accuracy & Drift Detection](../templates/healthcare/provider-directory-accuracy-drift-detection/README.md) | tabular | binary-event-classification | adaptable |
| 122 | [Provider Network Attrition Prediction](../templates/healthcare/provider-network-attrition-prediction/README.md) | tabular | survival-time-to-event | none |
| 123 | [Provider Network Expansion Optimization](../templates/healthcare/provider-network-expansion-optimization/README.md) | optimize | optimisation-allocation | adaptable |
| 124 | [Provider Availability & Access Prediction](../templates/healthcare/provider-availability-access-prediction/README.md) | forecast | forecasting | exact |
| 125 | [Provider Data Reconciliation Across Payer Systems](../templates/healthcare/provider-data-reconciliation-across-payer-systems/README.md) | graph | entity-resolution | exact |

## Subdomain structure and tracks

The domain page gains ten tracks beside the original eight (`content/tracks.json`, positions 51 to 125, partitioning exactly): workforce 51-60, provider lifecycle 61-68, quality and safety 69-76, vendor and facility access 77-82, procurement and spend 83-90, contract and legal 91-98, regulatory compliance 99-106, physician scheduling 107-112, clinical communications 113-118, payer and provider network 119-125.

## Overlap and de-duplication accounting

None of the 75 is a copy of an existing blueprint. Where a neighbour exists, the new blueprint keeps a different object, decision owner or control boundary:

| New use case | Closest existing or sibling blueprint | Why both stay |
|---|---|---|
| Float Pool & Cross-Department Staff Allocation, Workforce Skill-Mix Optimization, Physician On-Call & Call-Rotation Optimization | Nurse Scheduling Optimisation | Nurse scheduling builds a unit roster. Float-pool and skill-mix allocate across units and skills; on-call rotation is for physicians under contract, rest and fairness rules. |
| Purchase Demand Consolidation Optimization | Hospital Supply & Consumables Forecasting | The existing blueprint forecasts consumption. This one turns forecasts into consolidated supplier orders under contract tiers and safety stock. |
| Clinical Communication Urgency Classification | Patient Portal Message Triage & Drafts | The existing blueprint serves patient-to-practice messages. This one serves clinician and care-team messaging and keeps deterministic emergency rules above the model. |
| Physician Availability & Schedule Conflict Detection | OR Scheduling & Surgical Case Duration Prediction | OR scheduling predicts case duration. Conflict detection checks overlapping commitments and travel feasibility across clinic, OR, call and telehealth. |
| Provider Data Reconciliation Across Payer Systems | Provider Data Quality & Entity Resolution (61-68 group) | Entity resolution merges duplicate identities inside provider operations. Reconciliation sets survivorship and effective-dated history across payer, credentialing, claims and directory systems. |
| Provider Directory Accuracy & Drift Detection | Provider Directory Accuracy Prediction (61-68 group) | Prediction scores which records are likely to be wrong next. Drift detection compares field values with authoritative and attested sources. |
| Regulatory Quality Measure Gap Detection | Hospital Quality Measure Performance Forecasting | One finds requirement gaps from cited text; the other forecasts measure values. |
| Contract Price Variance, Contract-vs-PO Compliance, Procurement Spend Anomaly Detection | each other | Spend anomaly ranks unusual purchasing; contract-vs-PO tests lines against terms; price variance computes the expected price and the recoverable amount. |

## Problem-type decisions

The automatic classifier decided all but two. Two overrides are recorded with reasons in `content/kit-compatibility.json`: Provider Data Reconciliation Across Payer Systems is an entity-resolution problem and Provider Network Gap Identification groups unserved demand with no ground-truth label (clustering). Where the first draft of a blueprint landed on a misleading pattern (for example a rules-based conflict detector read as a graph problem), the text was reworded rather than overridden.

## What was run, and what was not

Run in the build environment (offline, repository tools):

- Every one of the 75 entries parses, expands and passes the repository's schema and loss-symbol checks (`parseUseCaseFile`, `expand`).
- `npm run content:build` equivalent (`tsx scripts/build-content.ts`): 575 use cases, healthcare 125.
- `tools/export_blueprints.py`, `tools/build_packs.py`, `tools/run_packs.py` for each new pack (all 75 ran), `tools/render_results.py` (575 packs rendered), `tools/validate_repo.py`: 575 packs, 0 problems.

Not run, because the environment had no network and could not install packages (`jsdom`, `vitest` and others are missing): `npm run validate:content`, `npm test` (vitest, including `kit-compat` and `fde-playbooks`, whose expected counts were updated by hand), `npm run typecheck`, `npm run lint`, `npm run build` and `build:static`, `verify:static`, `check:links`. Run them before merging.

Not done: composite architectures across subdomains (the plan's Phase 4), related-use-case links between overlapping blueprints, search facets and screenshots, and recomputed coverage figures in the README that were measured on the original 500 blueprints. A hand-edited count in `src/components/HeaderNav.tsx` (575) should become derived from the index when the site next changes.
