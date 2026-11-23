# Ticket Classification and Routing: discovery workbook

> Generated from the blueprint `it-ops/ticket-classification-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ticket Classification and Routing · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for Ticket Classification and Routing: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Service desk agents and employees (quick answers and fulfilment without handing over personal data). Affected without operating it: CIO, finance and works councils (cost control and service levels without employee surveillance). Confirm who really touches the output, as opposed to who is named in the project charter. | Service desk agents and employees and Site reliability and operations engineers | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | Site reliability and operations engineers owns the business outcome and the thresholds; the model owner in IT Ops AI owns the model; an independent validator challenges both. | Site reliability and operations engineers | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | Monitoring, incident and problem management runs on fixed rules, manual work and periodic reports on top of mixed on-premises and cloud estates, an inaccurate configuration database, tool sprawl, undocumented dependencies and manual change processes. The usual failure is the category chosen at creation: requesters choose wrongly. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of monitoring, incident and problem management | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | Incident and change records consumes the decision within 2500 ms at p99; Remediation runbook executions receives the cases that need a person; IT service management platform stays the system of record. Confirm each consumer's interface (OpenTelemetry), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "Multiple issues": one ticket describes several problems. It is detected through reassignment rate and through reviewer overrides in Remediation runbook executions, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | Site reliability and operations engineers and Security operations and risk teams | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | Site reliability and operations engineers approves changes to thresholds and business rules; model promotion follows the medium-risk path (Model owner and product owner approve promotion on green gates and fairness-slice results). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | Site reliability and operations engineers and Security operations and risk teams | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (problem records and root causes confirmed days after an incident, and change failures that appear after a window closes) of: reassignment rate; time to first touch; resolution time. The technical baseline to beat is: Requesters choosing a category from a menu and dispatchers reassigning, because it is the usual flow. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in reassignment rate and in handling effort, less run cost (modelled at $12.2K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | Site reliability and operations engineers and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| Site reliability and operations engineers | Fewer noisy alerts, faster diagnosis and safe automation | decides |   |   |
| Service desk agents and employees | Quick answers and fulfilment without handing over personal data | uses |   |   |
| Security operations and risk teams | Prioritised alerts, evidence and enforced approvals | consulted |   |   |
| CIO, finance and works councils | Cost control and service levels without employee surveillance | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Service desk agents and employees | Quick answers and fulfilment without handing over personal data | - Opens the case in Remediation runbook executions<br>- Reads the decision with its reason codes<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| CIO, finance and works councils | Cost control and service levels without employee surveillance | - Uses the existing channel, unchanged<br>- Receives the outcome through Cost, capacity and security reports<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| Site reliability and operations engineers | Fewer noisy alerts, faster diagnosis and safe automation | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from Metrics, logs and traces
- Monitoring, incident and problem management is applied with fixed rules and manual checks on top of mixed on-premises and cloud estates, an inaccurate configuration database, tool sprawl, undocumented dependencies and manual change processes
- Exceptions go to Service desk agents and employees, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from Metrics, logs and traces as before
- Ticket intake → Text parsing → Category and team classifier → Urgency rules produce the decision within 2500 ms at p99
- Incident and change records uses it directly; uncertain or high-impact cases go to Remediation runbook executions with reason codes
- Cost, capacity and security reports carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Service desk agents and employees work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (Site reliability and operations engineers)
- mixed on-premises and cloud estates, an inaccurate configuration database, tool sprawl, undocumented dependencies and manual change processes stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a decision for every valid input from Metrics, logs and traces within 2500 ms at p99. | Given a valid input, when it is submitted, then a decision is returned within 2500 ms at p99 in at least 99% of requests in the load test. |   |
| FR-2 | Return the main reasons for each decision. | Given any decision, when a reviewer opens it, then at least the top reason codes are shown and agree with the model inputs. |   |
| FR-3 | Let Service desk agents and employees accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let Site reliability and operations engineers change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report reassignment rate and time to first touch against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | p99 ≤ 2500 ms end to end including edge and network reserve | Per-stage and end-to-end latency histograms at the gateway |   |
| Availability | 99.95% (21.6 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 63 req/s provisioned (peak 42 req/s) | Load test at 1.2× provisioned |   |
| Data freshness | Features 60 seconds fresh at p95 | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 5 minutes (region evacuation), under 60 seconds for request routing; RPO Up to 60 seconds of feature state; exact counters have a single writer per key | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Confidential: configuration, network and architecture data; no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Top reason codes returned with each decision | Reason-code coverage and sampled review |   |
| Cost | ≤ $0.816 per 1,000 decisions (1.2× the modelled $0.680) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture reassignment rate; time to first touch; resolution time from the system of record before build, over at least one label-maturity window (problem records and root causes confirmed days after an incident, and change failures that appear after a window closes).
- **Target:** Improve reassignment rate against the measured baseline while holding time to first touch inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Reassignment rate
- Time to first touch
- Resolution time

**Costs**

- Run cost of the model plane: about $12.2K per month at the default workload ($0.680 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (problem records and root causes confirmed days after an incident, and change failures that appear after a window closes)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | Site reliability and operations engineers | Security operations and risk teams; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | Site reliability and operations engineers | Service desk agents and employees; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | Site reliability and operations engineers |
| Approve thresholds and business policy | Site reliability and operations engineers | Site reliability and operations engineers | Security operations and risk teams; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; Security operations and risk teams | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | Site reliability and operations engineers |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | Site reliability and operations engineers |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | Site reliability and operations engineers | All roles | Service desk agents and employees |
| Track benefit against the baseline | Business Analyst | Site reliability and operations engineers | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | Site reliability and operations engineers | open |   |
| RACI is agreed and the policy approver is named | Site reliability and operations engineers | open |   |
| ROI measure, unit values and data source are agreed with finance | Site reliability and operations engineers | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The medium risk tier and its approval path are accepted | Security Engineer | open |   |
