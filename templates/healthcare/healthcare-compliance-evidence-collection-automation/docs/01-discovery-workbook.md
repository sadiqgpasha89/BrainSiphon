# Healthcare Compliance Evidence Collection Automation: discovery workbook

> Generated from the blueprint `healthcare/healthcare-compliance-evidence-collection-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Evidence Collection Automation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for Healthcare Compliance Evidence Collection Automation: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Nurses and physicians at the point of care (actionable, explained prompts inside their existing workflow). Affected without operating it: Hospital IT and integration (standards-based integration that does not destabilise the EHR). Confirm who really touches the output, as opposed to who is named in the project charter. | Nurses and physicians at the point of care and Chief Medical Information Officer and clinical lead | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | Chief Medical Information Officer and clinical lead owns the business outcome and the thresholds; the model owner in Clinical Informatics owns the model; an independent validator challenges both. | Chief Medical Information Officer and clinical lead | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | Triage and admission runs on fixed rules, manual work and periodic reports on top of an EHR and interface engine with long change cycles and clinical-safety sign-off for every change. The usual failure is copied file: A copy cannot prove where it came from. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of triage and admission | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | Evidence binder consumes the answer or action once the run publishes; Control-to-evidence map receives the cases that need a person; Control catalogue and evidence requirements stays the system of record. Confirm each consumer's interface (Connectors to document repositories and report systems), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "Evidence exists only in a person's mailbox": the connector cannot see it. It is detected through audit preparation hours and through reviewer overrides in Control-to-evidence map, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | Chief Medical Information Officer and clinical lead and Patient safety and quality | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | Chief Medical Information Officer and clinical lead approves changes to thresholds and business rules; model promotion follows the critical-risk path (Formal AI risk assessment and hazard or safety case before build). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | Chief Medical Information Officer and clinical lead and Patient safety and quality | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (outcomes such as 30-day readmission or mortality that arrive after discharge) of: audit preparation hours; evidence requests answered first time; exceptions found before the audit. The technical baseline to beat is: Control owners email documents to the audit coordinator before an audit. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in audit preparation hours and in handling effort, less run cost (modelled at $2.0K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | Chief Medical Information Officer and clinical lead and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| Chief Medical Information Officer and clinical lead | Clinically validated benefit without alert fatigue | decides |   |   |
| Nurses and physicians at the point of care | Actionable, explained prompts inside their existing workflow | uses |   |   |
| Patient safety and quality | A safety case, incident learning and monitored subgroup performance | consulted |   |   |
| Hospital IT and integration | Standards-based integration that does not destabilise the EHR | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Nurses and physicians at the point of care | Actionable, explained prompts inside their existing workflow | - Opens the case in Control-to-evidence map<br>- Reads the answer or action with its reason codes and cited sources<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| Hospital IT and integration | Standards-based integration that does not destabilise the EHR | - Uses the existing channel, unchanged<br>- Receives the outcome through Freshness and completeness status<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| Chief Medical Information Officer and clinical lead | Clinically validated benefit without alert fatigue | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from Control catalogue
- Triage and admission is applied with fixed rules and manual checks on top of an EHR and interface engine with long change cycles and clinical-safety sign-off for every change
- Exceptions go to Nurses and physicians at the point of care, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from Control catalogue as before
- Requirement and owner intake → Evidence connectors → Document classifier and matcher → Freshness and completeness checker produce the answer or action in the scheduled run
- Evidence binder uses it directly; uncertain or high-impact cases go to Control-to-evidence map with reason codes
- Freshness and completeness status carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Nurses and physicians at the point of care work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (Chief Medical Information Officer and clinical lead)
- an EHR and interface engine with long change cycles and clinical-safety sign-off for every change stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a answer or action for every valid input from Control catalogue by the end of the run window. | Given a valid input, when it is submitted, then a answer or action is returned by the end of the run window in at least 99% of requests in the load test. |   |
| FR-2 | Show the sources and tool calls behind every answer. | Given any answer, when a reviewer opens it, then every claim links to a retrieved source or a tool result. |   |
| FR-3 | Let Nurses and physicians at the point of care accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let Chief Medical Information Officer and clinical lead change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report audit preparation hours and evidence requests answered first time against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | Run completes inside a 2 hour window | Run duration per partition |   |
| Availability | 99.99% (4.3 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 60,000 rows per daily run | Rows processed per run |   |
| Data freshness | Inputs landed before the run | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 2 hours (one run window); RPO Last completed daily partition | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Restricted: identifiable clinical data (PHI); no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Every answer cites its sources and tool calls | Reason-code coverage and sampled review |   |
| Cost | ≤ $1.34 per 1,000 decisions (1.2× the modelled $1.11) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture audit preparation hours; evidence requests answered first time; exceptions found before the audit from the system of record before build, over at least one label-maturity window (outcomes such as 30-day readmission or mortality that arrive after discharge).
- **Target:** Improve audit preparation hours against the measured baseline while holding evidence requests answered first time inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Audit preparation hours
- Evidence requests answered first time
- Exceptions found before the audit

**Costs**

- Run cost of the model plane: about $2.0K per month at the default workload ($1.11 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (outcomes such as 30-day readmission or mortality that arrive after discharge)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | Chief Medical Information Officer and clinical lead | Patient safety and quality; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | Chief Medical Information Officer and clinical lead | Nurses and physicians at the point of care; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | Chief Medical Information Officer and clinical lead |
| Approve thresholds and business policy | Chief Medical Information Officer and clinical lead | Chief Medical Information Officer and clinical lead | Patient safety and quality; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; Patient safety and quality | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | Chief Medical Information Officer and clinical lead |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | Chief Medical Information Officer and clinical lead |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | Chief Medical Information Officer and clinical lead | All roles | Nurses and physicians at the point of care |
| Track benefit against the baseline | Business Analyst | Chief Medical Information Officer and clinical lead | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | Chief Medical Information Officer and clinical lead | open |   |
| RACI is agreed and the policy approver is named | Chief Medical Information Officer and clinical lead | open |   |
| ROI measure, unit values and data source are agreed with finance | Chief Medical Information Officer and clinical lead | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The critical risk tier and its approval path are accepted | Security Engineer | open |   |
