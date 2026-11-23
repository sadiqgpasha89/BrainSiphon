# Site Battery & Power Failure Prediction: discovery workbook

> Generated from the blueprint `telecom/site-power-battery-failure-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Site Battery & Power Failure Prediction · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for Site Battery & Power Failure Prediction: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Customer care and digital channels (issues found and resolved before the customer calls, with explainable agent actions). Affected without operating it: Regulator-facing compliance and privacy office (subscriber data minimised, retention enforced and every automated action auditable). Confirm who really touches the output, as opposed to who is named in the project charter. | Customer care and digital channels and Head of network operations (NOC) | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | Head of network operations (NOC) owns the business outcome and the thresholds; the model owner in Network and Customer AI owns the model; an independent validator challenges both. | Head of network operations (NOC) | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | Fault, performance and change management runs on fixed rules, manual work and periodic reports on top of decades of vendor-specific OSS and BSS platforms with batch interfaces, inconsistent identifiers and change windows measured in weeks. The usual failure is any alarm: many alarms are minor. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of fault, performance and change management | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | Network orchestrator and change tickets consumes the scored result once the run publishes; Care agent desktop, chat and notification channels receives the cases that need a person; OSS: inventory, fault and performance management stays the system of record. Confirm each consumer's interface (NETCONF/YANG and gNMI streaming telemetry), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "No outages in the window": no discharge evidence. It is detected through site outages due to power and through reviewer overrides in Care agent desktop, chat and notification channels, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | Head of network operations (NOC) and Product, billing and revenue assurance | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | Head of network operations (NOC) approves changes to thresholds and business rules; model promotion follows the low-risk path (Model owner approves promotion when the automated gates are green). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | Head of network operations (NOC) and Product, billing and revenue assurance | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (fault root causes confirmed after repair, churn and billing disputes that resolve over weeks) of: site outages due to power; batteries replaced early; generator callouts. The technical baseline to beat is: Replace batteries by age, because it is the usual maintenance policy. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in site outages due to power and in handling effort, less run cost (modelled at $3.5K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | Head of network operations (NOC) and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| Head of network operations (NOC) | Fewer customer-impacting faults, shorter time to restore and changes that do not cause outages | decides |   |   |
| Customer care and digital channels | Issues found and resolved before the customer calls, with explainable agent actions | uses |   |   |
| Product, billing and revenue assurance | Accurate rating, fewer leakage and fraud losses and fast activation of new services | consulted |   |   |
| Regulator-facing compliance and privacy office | Subscriber data minimised, retention enforced and every automated action auditable | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Customer care and digital channels | Issues found and resolved before the customer calls, with explainable agent actions | - Opens the case in Care agent desktop, chat and notification channels<br>- Reads the scored result with its reason codes<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| Regulator-facing compliance and privacy office | Subscriber data minimised, retention enforced and every automated action auditable | - Uses the existing channel, unchanged<br>- Receives the outcome through Billing, rating and fraud-management systems<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| Head of network operations (NOC) | Fewer customer-impacting faults, shorter time to restore and changes that do not cause outages | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from Network element telemetry, alarms and syslog (streaming)
- Fault, performance and change management is applied with fixed rules and manual checks on top of decades of vendor-specific OSS and BSS platforms with batch interfaces, inconsistent identifiers and change windows measured in weeks
- Exceptions go to Customer care and digital channels, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from Network element telemetry, alarms and syslog (streaming) as before
- Telemetry ingestion → Discharge event extraction → Health model → Impact ranking produce the scored result in the scheduled run
- Network orchestrator and change tickets uses it directly; uncertain or high-impact cases go to Care agent desktop, chat and notification channels with reason codes
- Billing, rating and fraud-management systems carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Customer care and digital channels work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (Head of network operations (NOC))
- decades of vendor-specific OSS and BSS platforms with batch interfaces, inconsistent identifiers and change windows measured in weeks stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a scored result for every valid input from Network element telemetry, alarms and syslog (streaming) by the end of the run window. | Given a valid input, when it is submitted, then a scored result is returned by the end of the run window in at least 99% of requests in the load test. |   |
| FR-2 | Return the main reasons for each decision. | Given any decision, when a reviewer opens it, then at least the top reason codes are shown and agree with the model inputs. |   |
| FR-3 | Let Customer care and digital channels accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let Head of network operations (NOC) change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report site outages due to power and batteries replaced early against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | Run completes inside a 2 hour window | Run duration per partition |   |
| Availability | 99.95% (21.6 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 72,000,000 rows per daily run | Rows processed per run |   |
| Data freshness | Inputs landed before the run | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 2 hours (one run window); RPO Last completed daily partition | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Restricted: subscriber identifiers, location and call detail data; no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Top reason codes returned with each decision | Reason-code coverage and sampled review |   |
| Cost | ≤ $0.0019 per 1,000 decisions (1.2× the modelled $0.0016) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture site outages due to power; batteries replaced early; generator callouts from the system of record before build, over at least one label-maturity window (fault root causes confirmed after repair, churn and billing disputes that resolve over weeks).
- **Target:** Improve site outages due to power against the measured baseline while holding batteries replaced early inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Site outages due to power
- Batteries replaced early
- Generator callouts

**Costs**

- Run cost of the model plane: about $3.5K per month at the default workload ($0.0016 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (fault root causes confirmed after repair, churn and billing disputes that resolve over weeks)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | Head of network operations (NOC) | Product, billing and revenue assurance; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | Head of network operations (NOC) | Customer care and digital channels; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | Head of network operations (NOC) |
| Approve thresholds and business policy | Head of network operations (NOC) | Head of network operations (NOC) | Product, billing and revenue assurance; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; Product, billing and revenue assurance | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | Head of network operations (NOC) |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | Head of network operations (NOC) |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | Head of network operations (NOC) | All roles | Customer care and digital channels |
| Track benefit against the baseline | Business Analyst | Head of network operations (NOC) | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | Head of network operations (NOC) | open |   |
| RACI is agreed and the policy approver is named | Head of network operations (NOC) | open |   |
| ROI measure, unit values and data source are agreed with finance | Head of network operations (NOC) | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The low risk tier and its approval path are accepted | Security Engineer | open |   |
