# Predictive Test Selection: discovery workbook

> Generated from the blueprint `saas/predictive-test-selection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Test Selection · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for Predictive Test Selection: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Customer success and support (accurate answers and risk signals with the evidence behind them). Affected without operating it: Enterprise customer administrators (control over what the AI can see and do for their tenant). Confirm who really touches the output, as opposed to who is named in the project charter. | Customer success and support and VP Product and head of the AI platform | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | VP Product and head of the AI platform owns the business outcome and the thresholds; the model owner in AI Platform owns the model; an independent validator challenges both. | VP Product and head of the AI platform | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | In-product assistance and automation runs on fixed rules, manual work and periodic reports on top of a multi-tenant product with its own permission model that the AI must respect rather than replace. The usual failure is run everything or file-path rules: running all tests doesn't scale. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of in-product assistance and automation | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | In-product experience (UI and API) consumes the decision within 2500 ms at p99; Support and customer-success workflows receives the cases that need a person; Tenant and entitlement service stays the system of record. Confirm each consumer's interface (OAuth2/OIDC), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "New test with no history": a brand-new test has no failure history, is never selected and its regressions escape. It is detected through escaped regressions and through reviewer overrides in Support and customer-success workflows, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | VP Product and head of the AI platform and Security and trust | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | VP Product and head of the AI platform approves changes to thresholds and business rules; model promotion follows the medium-risk path (Model owner and product owner approve promotion on green gates and fairness-slice results). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | VP Product and head of the AI platform and Security and trust | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (churn and expansion that show up 30 to 90 days later) of: escaped regressions; CI minutes per commit. The technical baseline to beat is: Run tests mapped by directory. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in escaped regressions and in handling effort, less run cost (modelled at $6.6K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | VP Product and head of the AI platform and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| VP Product and head of the AI platform | Features that ship safely across tenants at predictable cost | decides |   |   |
| Customer success and support | Accurate answers and risk signals with the evidence behind them | uses |   |   |
| Security and trust | Tenant isolation and no data leakage through prompts, indexes or logs | consulted |   |   |
| Enterprise customer administrators | Control over what the AI can see and do for their tenant | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Customer success and support | Accurate answers and risk signals with the evidence behind them | - Opens the case in Support and customer-success workflows<br>- Reads the decision with its reason codes<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| Enterprise customer administrators | Control over what the AI can see and do for their tenant | - Uses the existing channel, unchanged<br>- Receives the outcome through Billing and usage metering<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| VP Product and head of the AI platform | Features that ship safely across tenants at predictable cost | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from Product events and API logs
- In-product assistance and automation is applied with fixed rules and manual checks on top of a multi-tenant product with its own permission model that the AI must respect rather than replace
- Exceptions go to Customer success and support, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from Product events and API logs as before
- Change event → Feature builder → Failure predictor → Selector produce the decision within 2500 ms at p99
- In-product experience (UI and API) uses it directly; uncertain or high-impact cases go to Support and customer-success workflows with reason codes
- Billing and usage metering carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Customer success and support work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (VP Product and head of the AI platform)
- a multi-tenant product with its own permission model that the AI must respect rather than replace stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a decision for every valid input from Product events and API logs within 2500 ms at p99. | Given a valid input, when it is submitted, then a decision is returned within 2500 ms at p99 in at least 99% of requests in the load test. |   |
| FR-2 | Return the main reasons for each decision. | Given any decision, when a reviewer opens it, then at least the top reason codes are shown and agree with the model inputs. |   |
| FR-3 | Let Customer success and support accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let VP Product and head of the AI platform change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report escaped regressions and CI minutes per commit against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | p99 ≤ 2500 ms end to end including edge and network reserve | Per-stage and end-to-end latency histograms at the gateway |   |
| Availability | 99.95% (21.6 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 6,250 req/s provisioned (peak 4,167 req/s) | Load test at 1.2× provisioned |   |
| Data freshness | Features 60 seconds fresh at p95 | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 15 minutes per tenant cell, under 60 seconds for the inference plane; RPO Up to 30 seconds of tenant state (asynchronous replication lag) | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Confidential: tenant content and usage; no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Top reason codes returned with each decision | Reason-code coverage and sampled review |   |
| Cost | ≤ $0.0044 per 1,000 decisions (1.2× the modelled $0.0036) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture escaped regressions; CI minutes per commit from the system of record before build, over at least one label-maturity window (churn and expansion that show up 30 to 90 days later).
- **Target:** Improve escaped regressions against the measured baseline while holding CI minutes per commit inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Escaped regressions
- CI minutes per commit

**Costs**

- Run cost of the model plane: about $6.6K per month at the default workload ($0.0036 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (churn and expansion that show up 30 to 90 days later)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | VP Product and head of the AI platform | Security and trust; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | VP Product and head of the AI platform | Customer success and support; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | VP Product and head of the AI platform |
| Approve thresholds and business policy | VP Product and head of the AI platform | VP Product and head of the AI platform | Security and trust; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; Security and trust | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | VP Product and head of the AI platform |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | VP Product and head of the AI platform |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | VP Product and head of the AI platform | All roles | Customer success and support |
| Track benefit against the baseline | Business Analyst | VP Product and head of the AI platform | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | VP Product and head of the AI platform | open |   |
| RACI is agreed and the policy approver is named | VP Product and head of the AI platform | open |   |
| ROI measure, unit values and data source are agreed with finance | VP Product and head of the AI platform | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The medium risk tier and its approval path are accepted | Security Engineer | open |   |
