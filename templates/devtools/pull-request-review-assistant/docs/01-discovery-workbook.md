# Pull Request Review Assistant: discovery workbook

> Generated from the blueprint `devtools/pull-request-review-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pull Request Review Assistant · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

Phase 0 as a workbook. Each question has a proposed answer taken from the blueprint; confirm it with the named person or replace it, and record the evidence.

## Summary

Phase 0 is compulsory for Pull Request Review Assistant: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.

## Discovery questions

| Id | Question | Proposed answer | Confirm with | Evidence required | Confirmed answer | Owner | Status |
|---|---|---|---|---|---|---|---|
| system-user | Who is the actual system user? | Operators: Security and compliance teams (vulnerabilities, secrets and licences handled before release). Affected without operating it: Engineering leadership and works councils (team-level insight without individual surveillance). Confirm who really touches the output, as opposed to who is named in the project charter. | Security and compliance teams and Software engineers and tech leads | Named user groups with headcount, and interview or observation notes from the people who do the work today |   |   |   |
| decision-owner | Who owns the business decision? | Software engineers and tech leads owns the business outcome and the thresholds; the model owner in DevTools AI owns the model; an independent validator challenges both. | Software engineers and tech leads | A named accountable executive and a written delegation of who sets thresholds |   |   |   |
| existing-process | What is the existing process? | Writing, reviewing and testing code runs on fixed rules, manual work and periodic reports on top of large monorepos and legacy build systems, flaky test suites, fragmented tooling and code with no tests or documentation. The usual failure is the approver: approval carries accountability. Walk it step by step with the people who run it, with volumes, cycle times and exception rates. | The owner of writing, reviewing and testing code | A process map signed off by the people who run it, with measured cycle times and volumes |   |   |   |
| consuming-application | Which application will consume the model or AI output? | Pull request comments and suggested changes consumes the answer or action within 2500 ms at p99; Pipeline and release decisions receives the cases that need a person; Source control and code review platform stays the system of record. Confirm each consumer's interface (Git and code host webhooks and APIs), change window and owner. | The application owners and the Solution Architect | An interface inventory naming each consuming application, its owner, protocol and release calendar |   |   |   |
| wrong-output | What happens when the output is wrong? | The worst credible case is "Large diff": comments spread thin. It is detected through bugs found before merge and through reviewer overrides in Pipeline and release decisions, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system. | Software engineers and tech leads and Platform and release engineers | An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure |   |   |   |
| policy-approver | Who approves changes to business policies? | Software engineers and tech leads approves changes to thresholds and business rules; model promotion follows the high-risk path (Formal AI risk assessment before build and before launch). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release. | Software engineers and tech leads and Platform and release engineers | A named policy approver, a change-record template and the approval path accepted by risk or compliance |   |   |   |
| baseline-performance | What is the baseline business performance? | The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (production defects and security incidents that appear weeks or months after a change ships) of: bugs found before merge; review cycle time; comments dismissed as noise. The technical baseline to beat is: Linters and human review, because they are the standard checks. | The data analyst and the business owner | A baseline report from the system of record, with the query, the period and the owner who signed it |   |   |   |
| roi-measurement | How will financial or operational ROI be measured? | Value is the measured change in bugs found before merge and in handling effort, less run cost (modelled at $210.5K per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch. | Software engineers and tech leads and finance | An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout |   |   |   |

## Stakeholders

| Who | Needs | Involvement | Name | Interviewed on |
|---|---|---|---|---|
| Software engineers and tech leads | Less toil, faster feedback and suggestions they can verify | decides |   |   |
| Security and compliance teams | Vulnerabilities, secrets and licences handled before release | uses |   |   |
| Platform and release engineers | Reliable pipelines, safe rollouts and clear failure causes | consulted |   |   |
| Engineering leadership and works councils | Team-level insight without individual surveillance | informed |   |   |
| Enterprise architecture, security and operations | Integration, controls and run-ability agreed before anything is built | consulted |   |   |

## User journeys

| Persona | Goal | Steps | When Wrong |
|---|---|---|---|
| Security and compliance teams | Vulnerabilities, secrets and licences handled before release | - Opens the case in Pipeline and release decisions<br>- Reads the answer or action with its reason codes and cited sources<br>- Accepts it or overrides it with a recorded reason<br>- The override is stored as a labelled outcome | Overrides and escalates; a run of overrides on the same pattern opens a model review. |
| Engineering leadership and works councils | Team-level insight without individual surveillance | - Uses the existing channel, unchanged<br>- Receives the outcome through Security tickets and developer dashboards<br>- Sees a plain reason when the outcome is adverse<br>- Can contest the outcome through a defined route | Contests the outcome; the appeal is resolved by a person and recorded. |
| Software engineers and tech leads | Less toil, faster feedback and suggestions they can verify | - Reviews the KPI dashboard against the agreed baseline<br>- Approves threshold and policy changes on evidence<br>- Decides to promote, pause or roll back | Invokes the stop authority and returns the decision to the legacy path. |

## Process: as-is, to-be, what changes

**As-is**

- Input arrives from Repositories, commits and pull requests
- Writing, reviewing and testing code is applied with fixed rules and manual checks on top of large monorepos and legacy build systems, flaky test suites, fragmented tooling and code with no tests or documentation
- Exceptions go to Security and compliance teams, who decide case by case
- Outcomes are reported periodically and are rarely fed back as labelled examples

**To-be**

- Input arrives from Repositories, commits and pull requests as before
- Pull request event → Analyser run → Context retrieval → Comment drafting produce the answer or action within 2500 ms at p99
- Pull request comments and suggested changes uses it directly; uncertain or high-impact cases go to Pipeline and release decisions with reason codes
- Security tickets and developer dashboards carries the outcome to the affected party
- Every override and outcome is stored as a labelled example for monitoring and retraining

**What changes**

- Security and compliance teams work a smaller, explained queue instead of the raw volume
- Thresholds and rules become governed policy with a named approver (Software engineers and tech leads)
- large monorepos and legacy build systems, flaky test suites, fragmented tooling and code with no tests or documentation stays as the fallback path until the canary has held for a full label-maturity window

## Functional requirements

| Id | Requirement | Acceptance (given / when / then) | Traced to test |
|---|---|---|---|
| FR-1 | Return a answer or action for every valid input from Repositories, commits and pull requests within 2500 ms at p99. | Given a valid input, when it is submitted, then a answer or action is returned within 2500 ms at p99 in at least 99% of requests in the load test. |   |
| FR-2 | Show the sources and tool calls behind every answer. | Given any answer, when a reviewer opens it, then every claim links to a retrieved source or a tool result. |   |
| FR-3 | Let Security and compliance teams accept or override a result and record the reason. | Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set. |   |
| FR-4 | Degrade safely when the model plane is unavailable. | Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped. |   |
| FR-5 | Record every decision so it can be replayed. | Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version. |   |
| FR-6 | Let Software engineers and tech leads change thresholds and policy without a code release, under a change record. | Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step. |   |
| FR-7 | Report bugs found before merge and review cycle time against the agreed baseline. | Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named. |   |

## Non-functional requirements

| Attribute | Requirement | Measured by | Verified in |
|---|---|---|---|
| Latency | p99 ≤ 2500 ms end to end including edge and network reserve | Per-stage and end-to-end latency histograms at the gateway |   |
| Availability | 99.95% (21.6 minutes of error budget per 30 days) | Successful in-deadline responses ÷ valid requests |   |
| Throughput | 156 req/s provisioned (peak 104 req/s) | Load test at 1.2× provisioned |   |
| Data freshness | Features 60 seconds fresh at p95 | Consumer-side freshness SLI per contract |   |
| Recovery | RTO 5 minutes (region evacuation), under 60 seconds for request routing; RPO Up to 60 seconds of feature state; exact counters have a single writer per key | Quarterly failover game-day with measured RTO and RPO |   |
| Security | Confidential: proprietary source code and unreleased features; no direct production writes from the training plane | Access review, penetration test and policy-as-code checks |   |
| Auditability | Every decision replayable from (feature hash, model version, policy version, output) | Sampled ledger replay reproduces the output |   |
| Explainability | Every answer cites its sources and tool calls | Reason-code coverage and sampled review |   |
| Cost | ≤ $5.61 per 1,000 decisions (1.2× the modelled $4.68) | FinOps unit-cost dashboard |   |

## Business case

- **Baseline:** Not yet measured. Capture bugs found before merge; review cycle time; comments dismissed as noise from the system of record before build, over at least one label-maturity window (production defects and security incidents that appear weeks or months after a change ships).
- **Target:** Improve bugs found before merge against the measured baseline while holding review cycle time inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.
- **ROI formula:** `ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)`

**Value drivers**

- Bugs found before merge
- Review cycle time
- Comments dismissed as noise

**Costs**

- Run cost of the model plane: about $210.5K per month at the default workload ($4.68 per 1,000 decisions); a planning model, not a quote
- Build and integration effort across the roles involved, estimated once discovery is complete
- Human review and change management for the operating team

**How the benefit is measured**

- Phased rollout or a randomly held-out group so benefit is a difference, not an assertion
- Count benefit only from matured labels (production defects and security incidents that appear weeks or months after a change ships)
- Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review

**Assumptions**

- Volumes follow the modelled workload; replace them with real volumes in discovery
- Run cost uses public-price planning rates; replace with the negotiated cloud rates


**Measured baseline (fill in):** ____________  **Date measured:** ________  **By:** ________

## RACI for discovery

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Confirm business objective and decision rights | Business Analyst | Software engineers and tech leads | Platform and release engineers; AI Architect | Delivery team |
| Document AS-IS, TO-BE, journeys and requirements | Business Analyst | Software engineers and tech leads | Security and compliance teams; QA / Test Engineer | Architects |
| Measure baseline business performance | Data Analyst | Business Analyst | Data Engineer; finance | Software engineers and tech leads |
| Approve thresholds and business policy | Software engineers and tech leads | Software engineers and tech leads | Platform and release engineers; Security Engineer | MLOps Engineer; operations |
| Design the integration and architecture | Solution Architect | Solution Architect | AI Architect; Platform Engineer; Security Engineer | Business Analyst |
| Choose the model strategy and AI risk controls | AI Architect | AI Architect | Data Scientist; Platform and release engineers | Business Analyst |
| Build, validate and release the model | Data Scientist; ML Engineer; MLOps Engineer | AI Architect | QA / Test Engineer; Security Engineer | Software engineers and tech leads |
| Security and privacy sign-off | Security Engineer | Security Engineer | Platform Engineer; Solution Architect | Software engineers and tech leads |
| Go-live approval | SRE / DevOps Engineer; QA / Test Engineer | Software engineers and tech leads | All roles | Security and compliance teams |
| Track benefit against the baseline | Business Analyst | Software engineers and tech leads | Data Analyst; finance | Steering group |

## Discovery exit gate

| Criterion | Owner | Status | Evidence link |
|---|---|---|---|
| Every discovery question has a confirmed answer with a named owner | Business Analyst | open |   |
| AS-IS process, TO-BE process and user journeys are agreed with the people who run them | Business Analyst | open |   |
| Baseline business performance is measured, not estimated | Data Analyst | open |   |
| Functional requirements and acceptance criteria are approved | Software engineers and tech leads | open |   |
| RACI is agreed and the policy approver is named | Software engineers and tech leads | open |   |
| ROI measure, unit values and data source are agreed with finance | Software engineers and tech leads | open |   |
| Consuming applications and systems of record are confirmed with their owners | Solution Architect | open |   |
| Data owners and access are confirmed for every source | Data Engineer | open |   |
| The high risk tier and its approval path are accepted | Security Engineer | open |   |
