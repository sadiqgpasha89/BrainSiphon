# IRT Item Calibration & Computerised Adaptive Testing: discovery workbook

> Generated from the blueprint `edtech/irt-calibration-and-adaptive-testing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IRT Item Calibration & Computerised Adaptive Testing · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for IRT Item Calibration & Computerised Adaptive Testing: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Teachers and instructors (transparent recommendations they can accept or override). Affected without operating it: Student-data privacy officer (child-safe data handling and consent evidence). Confirm who really touches the output, as opposed to who is named in the project charter. | Teachers and instructors and Chief Academic Officer or head of learning | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | Chief Academic Officer or head of learning owns the business outcome and the thresholds; the model owner in Learning Platform owns the model; an independent validator challenges both. | Chief Academic Officer or head of learning | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | Adaptive learning and tutoring runs on fixed rules, manual work and periodic reports on top of an LMS and SIS with rigid integration standards and academic calendars. The usual failure is random or fixed forms: adaptive tests need 40-60% fewer items. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of adaptive learning and tutoring | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | Learner dashboards and the adaptive-path service consumes the decision within 80 ms at p99; Teacher gradebook and alerts receives the cases that need a person; Learning management system (LMS) stays the system of record. Confirm each consumer's interface (LTI 1.3), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "Items leaked online": item parameters drift and scores inflate. It is detected through test length for target precision and through reviewer overrides in Teacher gradebook and alerts, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | Chief Academic Officer or head of learning and Learners and guardians | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | Chief Academic Officer or head of learning approves changes to thresholds and business rules; model promotion follows the medium-risk path (Model owner and product owner approve promotion on green gates and fairness-slice results). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | Chief Academic Officer or head of learning and Learners and guardians | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (learning outcomes that show up over weeks or terms) of: test length for target precision; score validity evidence. The technical baseline to beat is: Fixed-form tests scored by number correct. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in test length for target precision and in handling effort, less run cost (modelled at $3.7K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | Chief Academic Officer or head of learning and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| Chief Academic Officer or head of learning | Measured learning gains, not engagement vanity metrics | decides |   |   |
| Teachers and instructors | Transparent recommendations they can accept or override | uses |   |   |
| Learners and guardians | Fair, understandable feedback and control of their data | consulted |   |   |
| Student-data privacy officer | Child-safe data handling and consent evidence | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Teachers and instructors | Transparent recommendations they can accept or override | - Opens the case in Teacher gradebook and alerts<br>- Reads the decision with its reason codes<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| Student-data privacy officer | Child-safe data handling and consent evidence | - Uses the existing channel, unchanged<br>- Receives the outcome through Guardian reporting<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| Chief Academic Officer or head of learning | Measured learning gains, not engagement vanity metrics | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from LTI 1.3 launches and xAPI or Caliper events
- Adaptive learning and tutoring is applied with fixed rules and manual checks on top of an LMS and SIS with rigid integration standards and academic calendars
- Exceptions go to Teachers and instructors, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from LTI 1.3 launches and xAPI or Caliper events as before
- Response data → Item calibration → Ability estimator → Item selector produce the decision within 80 ms at p99
- Learner dashboards and the adaptive-path service uses it directly; uncertain or high-impact cases go to Teacher gradebook and alerts with reason codes
- Guardian reporting carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Teachers and instructors work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (Chief Academic Officer or head of learning)
- an LMS and SIS with rigid integration standards and academic calendars stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a decision for every valid input from LTI 1.3 launches and xAPI or Caliper events within 80 ms at p99. | Given a valid input, when it is submitted, then a decision is returned within 80 ms at p99 in at least 99% of requests in the load test. |   |
| FR-2 | Return the main reasons for each decision. | Given any decision, when a reviewer opens it, then at least the top reason codes are shown and agree with the model inputs. |   |
| FR-3 | Let Teachers and instructors accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let Chief Academic Officer or head of learning change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report test length for target precision and score validity evidence against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | p99 ≤ 80 ms end to end including edge and network reserve | Per-stage and end-to-end latency histograms at the gateway |   |
| Availability | 99.95% (21.6 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 938 req/s provisioned (peak 625 req/s) | Load test at 1.2× provisioned |   |
| Data freshness | Features 30 seconds fresh at p95 | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 5 minutes (region evacuation), under 60 seconds for request routing; RPO Up to 60 seconds of feature state; exact counters have a single writer per key | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Restricted: minors' records and assessment results; no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Top reason codes returned with each decision | Reason-code coverage and sampled review |   |
| Cost | ≤ $0.016 per 1,000 decisions (1.2× the modelled $0.014) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture test length for target precision; score validity evidence from the system of record before build, over at least one label-maturity window (learning outcomes that show up over weeks or terms).
- **Target:** Improve test length for target precision against the measured baseline while holding score validity evidence inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Test length for target precision
- Score validity evidence

**Costs**

- Run cost of the model plane: about $3.7K per month at the default workload ($0.014 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (learning outcomes that show up over weeks or terms)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | Chief Academic Officer or head of learning | Learners and guardians; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | Chief Academic Officer or head of learning | Teachers and instructors; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | Chief Academic Officer or head of learning |
| Approve thresholds and business policy | Chief Academic Officer or head of learning | Chief Academic Officer or head of learning | Learners and guardians; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; Learners and guardians | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | Chief Academic Officer or head of learning |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | Chief Academic Officer or head of learning |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | Chief Academic Officer or head of learning | All roles | Teachers and instructors |
| Track benefit against the baseline | Business Analyst | Chief Academic Officer or head of learning | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | Chief Academic Officer or head of learning | open |   |
| RACI is agreed and the policy approver is named | Chief Academic Officer or head of learning | open |   |
| ROI measure, unit values and data source are agreed with finance | Chief Academic Officer or head of learning | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The medium risk tier and its approval path are accepted | Security Engineer | open |   |
