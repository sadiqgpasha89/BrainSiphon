# Site Hazard and PPE Detection: discovery workbook

> Generated from the blueprint `engineering/site-hazard-ppe-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Site Hazard and PPE Detection · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** advanced

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for Site Hazard and PPE Detection: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Project managers and site teams (early warning on schedule, cost and quality with clear evidence). Affected without operating it: Owners, clients and portfolio leaders (reliable forecasts and traceable decisions). Confirm who really touches the output, as opposed to who is named in the project charter. | Project managers and site teams and Design engineers and architects | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | Design engineers and architects owns the business outcome and the thresholds; the model owner in Engineering AI owns the model; an independent validator challenges both. | Design engineers and architects | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | Design, analysis and review runs on fixed rules, manual work and periodic reports on top of paper and PDF drawings, disconnected scheduling and cost tools, subcontractor data in spreadsheets and inconsistent model quality across projects. The usual failure is named workers: individual tracking is not allowed. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of design, analysis and review | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | Design review comments and change requests consumes the decision within 2500 ms at p99; Schedule, cost and risk reports receives the cases that need a person; CAD, BIM and document management system stays the system of record. Confirm each consumer's interface (IFC and BIM Collaboration Format), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "Night work": low light lowers accuracy. It is detected through hazards open beyond a day and through reviewer overrides in Schedule, cost and risk reports, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | Design engineers and architects and Safety, quality and compliance managers | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | Design engineers and architects approves changes to thresholds and business rules; model promotion follows the high-risk path (Formal AI risk assessment before build and before launch). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | Design engineers and architects and Safety, quality and compliance managers | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (defects, rework and cost overruns that appear months after the work is done, and structural performance that shows over years) of: hazards open beyond a day; near misses; time to correct hazards. The technical baseline to beat is: Safety walks and inspections by safety officers, because they are the standard control. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in hazards open beyond a day and in handling effort, less run cost (modelled at $12.4K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | Design engineers and architects and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| Design engineers and architects | Faster options and checks they can verify and sign off | decides |   |   |
| Project managers and site teams | Early warning on schedule, cost and quality with clear evidence | uses |   |   |
| Safety, quality and compliance managers | Hazards and defects found early without monitoring individual workers | consulted |   |   |
| Owners, clients and portfolio leaders | Reliable forecasts and traceable decisions | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Project managers and site teams | Early warning on schedule, cost and quality with clear evidence | - Opens the case in Schedule, cost and risk reports<br>- Reads the decision with its reason codes<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| Owners, clients and portfolio leaders | Reliable forecasts and traceable decisions | - Uses the existing channel, unchanged<br>- Receives the outcome through Inspection findings and handover records<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| Design engineers and architects | Faster options and checks they can verify and sign off | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from Drawings, models and specifications
- Design, analysis and review is applied with fixed rules and manual checks on top of paper and PDF drawings, disconnected scheduling and cost tools, subcontractor data in spreadsheets and inconsistent model quality across projects
- Exceptions go to Project managers and site teams, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from Drawings, models and specifications as before
- Camera stream → People blurring → Hazard classifier → Zone logic produce the decision within 2500 ms at p99
- Design review comments and change requests uses it directly; uncertain or high-impact cases go to Schedule, cost and risk reports with reason codes
- Inspection findings and handover records carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Project managers and site teams work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (Design engineers and architects)
- paper and PDF drawings, disconnected scheduling and cost tools, subcontractor data in spreadsheets and inconsistent model quality across projects stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a decision for every valid input from Drawings, models and specifications within 2500 ms at p99. | Given a valid input, when it is submitted, then a decision is returned within 2500 ms at p99 in at least 99% of requests in the load test. |   |
| FR-2 | Return the main reasons for each decision. | Given any decision, when a reviewer opens it, then at least the top reason codes are shown and agree with the model inputs. |   |
| FR-3 | Let Project managers and site teams accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let Design engineers and architects change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report hazards open beyond a day and near misses against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | p99 ≤ 2500 ms end to end including edge and network reserve | Per-stage and end-to-end latency histograms at the gateway |   |
| Availability | 99.95% (21.6 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 313 req/s provisioned (peak 208 req/s) | Load test at 1.2× provisioned |   |
| Data freshness | Features 60 seconds fresh at p95 | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 5 minutes (region evacuation), under 60 seconds for request routing; RPO Up to 60 seconds of feature state; exact counters have a single writer per key | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Confidential: designs, bids and client contract terms; no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Top reason codes returned with each decision | Reason-code coverage and sampled review |   |
| Cost | ≤ $0.165 per 1,000 decisions (1.2× the modelled $0.138) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture hazards open beyond a day; near misses; time to correct hazards from the system of record before build, over at least one label-maturity window (defects, rework and cost overruns that appear months after the work is done, and structural performance that shows over years).
- **Target:** Improve hazards open beyond a day against the measured baseline while holding near misses inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Hazards open beyond a day
- Near misses
- Time to correct hazards

**Costs**

- Run cost of the model plane: about $12.4K per month at the default workload ($0.138 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (defects, rework and cost overruns that appear months after the work is done, and structural performance that shows over years)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | Design engineers and architects | Safety, quality and compliance managers; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | Design engineers and architects | Project managers and site teams; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | Design engineers and architects |
| Approve thresholds and business policy | Design engineers and architects | Design engineers and architects | Safety, quality and compliance managers; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; Safety, quality and compliance managers | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | Design engineers and architects |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | Design engineers and architects |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | Design engineers and architects | All roles | Project managers and site teams |
| Track benefit against the baseline | Business Analyst | Design engineers and architects | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | Design engineers and architects | open |   |
| RACI is agreed and the policy approver is named | Design engineers and architects | open |   |
| ROI measure, unit values and data source are agreed with finance | Design engineers and architects | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The high risk tier and its approval path are accepted | Security Engineer | open |   |
