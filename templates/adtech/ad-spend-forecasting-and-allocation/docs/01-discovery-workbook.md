# Ad Spend Forecasting & Budget Allocation: discovery workbook

> Generated from the blueprint `adtech/ad-spend-forecasting-and-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Spend Forecasting & Budget Allocation · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for Ad Spend Forecasting & Budget Allocation: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Campaign managers and advertisers (predictable delivery, pacing and trustworthy reporting). Affected without operating it: Trading-platform SRE (A bidder that stays inside its deadline under peak load). Confirm who really touches the output, as opposed to who is named in the project charter. | Campaign managers and advertisers and Head of Ad Products and revenue | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | Head of Ad Products and revenue owns the business outcome and the thresholds; the model owner in Ad Platform owns the model; an independent validator challenges both. | Head of Ad Products and revenue | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | Real-time bidding and delivery runs on fixed rules, manual work and periodic reports on top of exchange integrations and a billing ledger with strict reconciliation rules. The usual failure is proportional allocation: equal marginal returns is the optimum. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of real-time bidding and delivery | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | Bid response to the exchange consumes the scored result once the run publishes; Pacing and budget service receives the cases that need a person; Campaign and budget ledger stays the system of record. Confirm each consumer's interface (OpenRTB 2.5/3.0 (JSON or Protobuf)), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "Sparse data for new campaigns": new campaigns have little data so fitted response curves are wild and misallocate budget. It is detected through total conversions at equal budget and through reviewer overrides in Pacing and budget service, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | Head of Ad Products and revenue and Privacy and legal | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | Head of Ad Products and revenue approves changes to thresholds and business rules; model promotion follows the low-risk path (Model owner approves promotion when the automated gates are green). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | Head of Ad Products and revenue and Privacy and legal | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (conversions inside 1 to 30 day attribution windows) of: total conversions at equal budget; budget utilisation. The technical baseline to beat is: Allocate proportionally to last period spend. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in total conversions at equal budget and in handling effort, less run cost (modelled at $1.7K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | Head of Ad Products and revenue and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| Head of Ad Products and revenue | Revenue and advertiser return at a fixed latency and cost | decides |   |   |
| Campaign managers and advertisers | Predictable delivery, pacing and trustworthy reporting | uses |   |   |
| Privacy and legal | Consent honoured on every request and sensitive categories excluded | consulted |   |   |
| Trading-platform SRE | A bidder that stays inside its deadline under peak load | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Campaign managers and advertisers | Predictable delivery, pacing and trustworthy reporting | - Opens the case in Pacing and budget service<br>- Reads the scored result with its reason codes<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| Trading-platform SRE | A bidder that stays inside its deadline under peak load | - Uses the existing channel, unchanged<br>- Receives the outcome through Reporting and billing<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| Head of Ad Products and revenue | Revenue and advertiser return at a fixed latency and cost | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from OpenRTB bid requests from exchanges
- Real-time bidding and delivery is applied with fixed rules and manual checks on top of exchange integrations and a billing ledger with strict reconciliation rules
- Exceptions go to Campaign managers and advertisers, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from OpenRTB bid requests from exchanges as before
- Performance data → Response-curve model → Allocator → Guardrails produce the scored result in the scheduled run
- Bid response to the exchange uses it directly; uncertain or high-impact cases go to Pacing and budget service with reason codes
- Reporting and billing carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Campaign managers and advertisers work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (Head of Ad Products and revenue)
- exchange integrations and a billing ledger with strict reconciliation rules stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a scored result for every valid input from OpenRTB bid requests from exchanges by the end of the run window. | Given a valid input, when it is submitted, then a scored result is returned by the end of the run window in at least 99% of requests in the load test. |   |
| FR-2 | Return the main reasons for each decision. | Given any decision, when a reviewer opens it, then at least the top reason codes are shown and agree with the model inputs. |   |
| FR-3 | Let Campaign managers and advertisers accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let Head of Ad Products and revenue change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report total conversions at equal budget and budget utilisation against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | Run completes inside a 2 hour window | Run duration per partition |   |
| Availability | 99.95% (21.6 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 3,000,000 rows per daily run | Rows processed per run |   |
| Data freshness | Inputs landed before the run | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 2 hours (one run window); RPO Last completed daily partition | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Confidential: user identifiers and behavioural segments; no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Top reason codes returned with each decision | Reason-code coverage and sampled review |   |
| Cost | ≤ $0.022 per 1,000 decisions (1.2× the modelled $0.018) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture total conversions at equal budget; budget utilisation from the system of record before build, over at least one label-maturity window (conversions inside 1 to 30 day attribution windows).
- **Target:** Improve total conversions at equal budget against the measured baseline while holding budget utilisation inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Total conversions at equal budget
- Budget utilisation

**Costs**

- Run cost of the model plane: about $1.7K per month at the default workload ($0.018 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (conversions inside 1 to 30 day attribution windows)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | Head of Ad Products and revenue | Privacy and legal; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | Head of Ad Products and revenue | Campaign managers and advertisers; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | Head of Ad Products and revenue |
| Approve thresholds and business policy | Head of Ad Products and revenue | Head of Ad Products and revenue | Privacy and legal; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; Privacy and legal | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | Head of Ad Products and revenue |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | Head of Ad Products and revenue |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | Head of Ad Products and revenue | All roles | Campaign managers and advertisers |
| Track benefit against the baseline | Business Analyst | Head of Ad Products and revenue | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | Head of Ad Products and revenue | open |   |
| RACI is agreed and the policy approver is named | Head of Ad Products and revenue | open |   |
| ROI measure, unit values and data source are agreed with finance | Head of Ad Products and revenue | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The low risk tier and its approval path are accepted | Security Engineer | open |   |
