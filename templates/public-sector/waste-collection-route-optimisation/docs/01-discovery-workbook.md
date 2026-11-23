# Waste Collection Route Optimisation: discovery workbook

> Generated from the blueprint `public-sector/waste-collection-route-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Waste Collection Route Optimisation · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for Waste Collection Route Optimisation: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Caseworkers and service teams (less paperwork and clear evidence with every recommendation). Affected without operating it: Auditors, ombudsman and elected officials (transparency, bias testing and a record of every automated decision). Confirm who really touches the output, as opposed to who is named in the project charter. | Caseworkers and service teams and Citizens and residents | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | Citizens and residents owns the business outcome and the thresholds; the model owner in Public Sector AI owns the model; an independent validator challenges both. | Citizens and residents | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | Citizen service delivery and case management runs on fixed rules, manual work and periodic reports on top of mainframe benefit and tax systems, siloed agency databases and paper-based processes with long procurement cycles. The usual failure is fill level alone: residents are promised pickups. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of citizen service delivery and case management | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | Caseworker queues and decision letters consumes the scored result once the run publishes; City operations dashboards and work orders receives the cases that need a person; Case management and CRM stays the system of record. Confirm each consumer's interface (REST and SOAP agency APIs), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "Sensor failure": fill data is missing. It is detected through kilometres driven and through reviewer overrides in City operations dashboards and work orders, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | Citizens and residents and City operations and planners | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | Citizens and residents approves changes to thresholds and business rules; model promotion follows the low-risk path (Model owner approves promotion when the automated gates are green). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | Citizens and residents and City operations and planners | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (appeal outcomes and audit findings that arrive months after a decision, and service outcomes that appear after a policy runs for years) of: kilometres driven; missed collection complaints; overtime hours. The technical baseline to beat is: Fixed weekly routes by zone, because they are the standard service pattern. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in kilometres driven and in handling effort, less run cost (modelled at $1.8K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | Citizens and residents and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| Citizens and residents | Fast, fair, explained decisions and a human to appeal to | decides |   |   |
| Caseworkers and service teams | Less paperwork and clear evidence with every recommendation | uses |   |   |
| City operations and planners | Forecasts and early warnings for services and infrastructure | consulted |   |   |
| Auditors, ombudsman and elected officials | Transparency, bias testing and a record of every automated decision | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Caseworkers and service teams | Less paperwork and clear evidence with every recommendation | - Opens the case in City operations dashboards and work orders<br>- Reads the scored result with its reason codes<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| Auditors, ombudsman and elected officials | Transparency, bias testing and a record of every automated decision | - Uses the existing channel, unchanged<br>- Receives the outcome through Public reports and open data portals<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| Citizens and residents | Fast, fair, explained decisions and a human to appeal to | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from Citizen applications and forms
- Citizen service delivery and case management is applied with fixed rules and manual checks on top of mainframe benefit and tax systems, siloed agency databases and paper-based processes with long procurement cycles
- Exceptions go to Caseworkers and service teams, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from Citizen applications and forms as before
- Fill and fleet data → Fill forecast → Route optimiser → Service rule filter produce the scored result in the scheduled run
- Caseworker queues and decision letters uses it directly; uncertain or high-impact cases go to City operations dashboards and work orders with reason codes
- Public reports and open data portals carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Caseworkers and service teams work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (Citizens and residents)
- mainframe benefit and tax systems, siloed agency databases and paper-based processes with long procurement cycles stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a scored result for every valid input from Citizen applications and forms by the end of the run window. | Given a valid input, when it is submitted, then a scored result is returned by the end of the run window in at least 99% of requests in the load test. |   |
| FR-2 | Return the main reasons for each decision. | Given any decision, when a reviewer opens it, then at least the top reason codes are shown and agree with the model inputs. |   |
| FR-3 | Let Caseworkers and service teams accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let Citizens and residents change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report kilometres driven and missed collection complaints against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | Run completes inside a 2 hour window | Run duration per partition |   |
| Availability | 99.95% (21.6 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 3,000,000 rows per daily run | Rows processed per run |   |
| Data freshness | Inputs landed before the run | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 2 hours (one run window); RPO Last completed daily partition | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Restricted: citizen case, tax and benefit data; no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Top reason codes returned with each decision | Reason-code coverage and sampled review |   |
| Cost | ≤ $0.024 per 1,000 decisions (1.2× the modelled $0.020) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture kilometres driven; missed collection complaints; overtime hours from the system of record before build, over at least one label-maturity window (appeal outcomes and audit findings that arrive months after a decision, and service outcomes that appear after a policy runs for years).
- **Target:** Improve kilometres driven against the measured baseline while holding missed collection complaints inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Kilometres driven
- Missed collection complaints
- Overtime hours

**Costs**

- Run cost of the model plane: about $1.8K per month at the default workload ($0.020 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (appeal outcomes and audit findings that arrive months after a decision, and service outcomes that appear after a policy runs for years)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | Citizens and residents | City operations and planners; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | Citizens and residents | Caseworkers and service teams; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | Citizens and residents |
| Approve thresholds and business policy | Citizens and residents | Citizens and residents | City operations and planners; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; City operations and planners | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | Citizens and residents |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | Citizens and residents |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | Citizens and residents | All roles | Caseworkers and service teams |
| Track benefit against the baseline | Business Analyst | Citizens and residents | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | Citizens and residents | open |   |
| RACI is agreed and the policy approver is named | Citizens and residents | open |   |
| ROI measure, unit values and data source are agreed with finance | Citizens and residents | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The low risk tier and its approval path are accepted | Security Engineer | open |   |
