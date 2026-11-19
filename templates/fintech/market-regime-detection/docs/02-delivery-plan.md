# Market Regime Detection: delivery plan

> Generated from the blueprint `fintech/market-regime-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Market Regime Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 24–32 engineer-days from empty repo to a shadow-ready system (more than with a starter kit, because the first four milestones are written from scratch); platform, security review and approvals are extra lead time.

**Skills the team needs**

- Time-ordered validation, windowed features and forecasting or anomaly metrics
- The vocabulary of FinTech & Payments: section 1 lists what to learn first
- Writing small, tested data and evaluation code yourself, because no starter kit does it for you

**Tools**

- Python 3.11+ or your team's usual modelling stack, with a test runner
- The production stack named in the blueprint, or your platform's equivalent: vendor API; rolling windows; Bayesian HMM

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Frame the decision and the success contract | 2-3 | - Write down the decision this system supports and who acts on it: Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound.<br>- Turn each constraint into a number with an owner: Decision lag under 1 day; Interpretable regime labels; Low false switching; Regime history reproducible<br>- Fix the launch metric "Drawdown reduction vs static", the guardrail "Turnover cost of regime switching" and the kill criteria that revert the launch | One-page decision spec: owner, cost of each kind of error, constraints as numbers, launch and kill criteria | Decision spec: Signed spec with a number for every constraint and for "Drawdown reduction vs static" and "Turnover cost of regime switching" before modelling starts (Review with the owner of the decision) |   |   |   |
| M1 | Data, labels and a split that cannot leak | 3-4 | - Inventory the sources behind "Realised vs implied vol spread", "Cross-asset correlation spike", "Credit spread momentum"; give each an owner, a schema contract and a freshness target<br>- Define the label exactly and measure its delay. The trap to design around first: Using smoothed state probabilities in backtests.<br>- Split the way the data will be used (by time and by entity). No reference kit generates this problem, so build the smallest dataset that has the real label structure (an anonymised extract, a public dataset or a hand-made synthetic set) and make every gate run on it in minutes | Reproducible dataset snapshot, a written label definition and a split manifest | Label and split checks: The label definition is signed off by its owner and 0 entities or time periods overlap between train and test, enforced by a test that fails on overlap (A unit test on the split code and a review of the label definition with its owner) |   |   |   |
| M2 | Signals in, noise out | 4-5 | - Implement the high-signal features: Realised vs implied vol spread (20d realised vol minus implied vol); Cross-asset correlation spike (rolling average pairwise correlation); Credit spread momentum (5-day change in IG-HY spread)<br>- Leakage review for each: Realised vs implied vol spread - Align timestamps across sources; Cross-asset correlation spike - Window excludes decision day close; Credit spread momentum - Use as-published spreads<br>- Delete the noise on purpose: Calendar month (spurious seasonality); Single-day return extremes (outliers without persistence). | Feature spec with owners and as-of semantics, plus a test that fails if any feature sees the future | Leakage test: 0 features use information that was not available at decision time, enforced by a test that fails if one does; every feature has an owner and an as-of definition (Recompute each feature as of the decision time and compare with the stored value) |   |   |   |
| M3 | Baseline first | 2-3 | - Build the baseline: Rule-based volatility bands.<br>- Report Regime-conditional return separation; Switching frequency on held-out data, and the same numbers for the dumbest reasonable alternative<br>- Write the baseline numbers down; every later claim is a delta against them | Baseline model, metric report and the number to beat | Baseline on "Regime-conditional return separation": "Regime-conditional return separation" recorded for the baseline on held-out data with a 95% interval, next to the same number for the simplest reasonable alternative (Hold-out evaluation with a bootstrap interval, written to the experiment log) |   |   |   |
| M4 | The production model, judged against the baseline | 4-5 | - Build the production design: Bayesian hidden Markov model with sticky-HDP priors on multi-asset features, filtered (not smoothed) probabilities feeding risk limits.<br>- Compare with the baseline on Regime-conditional return separation; Switching frequency, using intervals and several seeds<br>- Read the largest errors by hand with a domain expert and write down what they have in common | Challenger artifact, comparison report with intervals and an error-analysis note | Production design against the baseline on "Regime-conditional return separation": The production design beats the baseline by more than the 95% interval on "Regime-conditional return separation" in at least 4 of 5 seeds, and the 50 largest errors have been read by hand (Five seeded runs compared with the baseline, then an error review with a domain expert) |   |   |   |
| M5 | Pipeline, schedule and recovery | 6-8 | - Orchestrate the stages: Market data feed → Feature builder → Regime filter → Probability publisher → Limit adjuster, with Risk committee review and Regime audit outside the critical path<br>- Size for 3.0M rows a day and make every run idempotent, resumable and observable<br>- Define what happens when an upstream feed is late, partial or wrong, and rehearse it | Scheduled pipeline, backfill procedure, runbook and a capacity test | Run time and recovery: Run finishes inside the 2 hour window at 1.5 times the daily volume (4.5M rows), and a killed run resumes without duplicates (Full-scale dry run with a forced failure) |   |   |   |
| M6 | Shadow, canary and the first month | 3-4 | - Run in shadow for at least a week: score live traffic, take no action and compare with the baseline and with eventual outcomes<br>- Ramp 1% → 5% → 25% → 100% with automatic rollback on "Turnover cost of regime switching", reading "Drawdown reduction vs static" against a permanent control group<br>- Plan for the documented edge cases, starting with "Flash crash day": Minimum dwell time and robust features | Launch review with measured lift, guardrail status and sign-off from product, risk and operations | Guardrail and lift: "Turnover cost of regime switching" no worse than the baseline's at every ramp step, and "Drawdown reduction vs static" better than the control group by the target agreed in M0 (Dashboards on the decision log, read against the held-out control) |   |   |   |

## Decisions to take

**Ship "Rule-based volatility bands" first, or go straight to the production design?**

| Option | Choose When |
|---|---|
| Rule-based volatility bands | You need a working, explainable system quickly or have few labelled examples; it also stays in the system as the fallback rung |
| Bayesian hidden Markov model with sticky-HDP priors on multi-asset features, filtered (not smoothed) probabilities feeding risk limits | The baseline plateaus on Regime-conditional return separation on held-out data and error analysis shows the remaining error is model-limited, not data- or label-limited |

*Default:* Ship the baseline to shadow first and promote the production design only when it beats the baseline on the launch metric after variance

*Decision and date:* ____________

**Which constraint should the design bind to first?**

| Option | Choose When |
|---|---|
| Decision lag under 1 day | This is the requirement that is hardest to retrofit; design the architecture and the launch gate around it first and give the others a budget once it is met |
| Interpretable regime labels | This is the requirement that is hardest to retrofit; design the architecture and the launch gate around it first and give the others a budget once it is met |
| Low false switching | This is the requirement that is hardest to retrofit; design the architecture and the launch gate around it first and give the others a budget once it is met |

*Default:* Start with "Decision lag under 1 day" and prove it in the load test and the launch review before optimising anything else

*Decision and date:* ____________

**How do you find out whether it works before the full launch?**

| Option | Choose When |
|---|---|
| Offline evaluation on a time-based, entity-safe split | Always as the first gate; it is cheap but biased towards the incumbent system |
| Shadow mode on live traffic | The decision is consequential or the offline set cannot capture delayed or selected labels |
| A controlled online experiment | You can randomise, the effect is measurable on the launch metric in the time you have, and the guardrails are automatic |

*Default:* Offline gate, then shadow, then a canary with a permanent control group

*Decision and date:* ____________

## Pitfalls, by milestone

| At | Mistake | Symptom | Fix |
|---|---|---|---|
| M1 | Using smoothed state probabilities in backtests. | Offline results look better than live ones, and nothing in the test suite explains why. | Add a test that fails when it happens and evaluate on a split that mirrors production |
| M3 | Regimes defined with hindsight. | Offline results look better than live ones, and nothing in the test suite explains why. | Add a test that fails when it happens and evaluate on a split that mirrors production |
| M2 | Using "Calendar month" as a feature | It is noise: spurious seasonality. | Keep it out of the feature list and assert the list in a test, so it cannot return silently |
| M2 | Using "Single-day return extremes" as a feature | It is noise: outliers without persistence. | Keep it out of the feature list and assert the list in a test, so it cannot return silently |
| M3 | Thresholds on VIX instead of regime-switching models with sticky transition priors | Single-indicator thresholds whipsaw at boundaries. | Build the evaluation and the features around: Regime-switching models with sticky transition priors |
| M3 | Hard labels from smoothed fits instead of posterior regime probabilities used probabilistically | Smoothed regimes use future data and cannot be traded. | Build the evaluation and the features around: Posterior regime probabilities used probabilistically |
| M6 | Not planning for "Flash crash day" | model flips regime on one print. | Minimum dwell time and robust features. |
| M6 | Not planning for "New asset class enters" | feature set changes. | Versioned feature sets and refit with shadow comparison. |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Split integrity: no entity or time overlap between train and test | A unit test on the split code that fails on any shared entity or any test row earlier than a train row | The test passes on your data and fails on a deliberately leaky split |   |
| Point-in-time features: no feature sees the future | Recompute every feature as of its decision time and compare with the stored value | Every feature matches; one deliberately leaked feature makes the test fail |   |
| Reproducibility: the same seed gives the same metrics | Run the baseline twice with a fixed seed | "Regime-conditional return separation" is identical across both runs to the printed precision |   |
| Baseline sanity: the baseline beats a constant predictor | Compare against the simplest reasonable alternative | The baseline's "Regime-conditional return separation" is better than the constant or naive prediction by more than its interval |   |
| Offline metric agrees with an independent implementation | Recompute the headline metric in a second code path (a notebook or SQL) | "Regime-conditional return separation" matches to rounding on the held-out set |   |
| Edge-case replay: Flash crash day | Replay a recorded or synthetic case through the full path | The system behaves as planned: Minimum dwell time and robust features |   |
| Load test at 1.5× provisioned peak | Synthetic backfill at 1.5× daily volume | Run finishes inside the 2 h window at 1.5× data volume with no failed partitions |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on Regime-conditional return separation.
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "Flash crash day".
- [ ] Week 3 — 1% canary with an automatic rollback on "Turnover cost of regime switching"; read "Drawdown reduction vs static" against a held-out control group.
- [ ] Week 4 — first label-delay-aware evaluation on matured outcomes; decide ramp, hold or roll back, and record the decision with its evidence.
- [ ] Set the retraining cadence, the owner of the on-call runbook, and the date of the first game-day before any ramp beyond 25%.

## The seven delivery phases as a checklist

### Phase 0: Discovery and business requirements (Weeks 1–2)

Goal: Agree which decision the system will support, for whom, how success is measured and whether AI is warranted at all, before anyone designs or builds anything.

Lead: Business Analyst · Accountable: Executive sponsor

- [ ] **0.1 Pick the use case and read its blueprint once, end to end** · owner: Delivery lead (project manager) · Week 1, day 1 → A one-page note: what we adopt from the blueprint, and what differs here.
- [ ] **0.2 Name the sponsor, the decision owner and every stakeholder** · owner: Business Analyst · Week 1, days 1–2 → Stakeholder map with a named decision owner.
- [ ] **0.3 Answer the eight discovery questions with evidence** · owner: Business Analyst · Week 1, days 2–5 → Discovery log: eight questions, each with a confirmed answer, its owner and its evidence.
- [ ] **0.4 Map the AS-IS process and design the TO-BE process** · owner: Business Analyst · Week 1, days 3–5 → AS-IS and TO-BE process maps and user journeys, agreed with the people who run them.
- [ ] **0.5 Measure the baseline** · owner: Data Analyst · Weeks 1–2 → Baseline report with KPI definitions. Measured, not estimated.
- [ ] **0.6 Decide whether AI is warranted at all** · owner: AI Architect · Week 2 → AI go/no-go recommendation with the completed decision matrix.
- [ ] **0.7 Classify the data and confirm the risk tier** · owner: Security Engineer · Week 2 → Data classification, confirmed risk tier and the approval path.
- [ ] **0.8 Write the requirements and acceptance criteria** · owner: Business Analyst · Week 2 → Approved requirements, testable acceptance criteria and a scope boundary.
- [ ] **0.9 Agree the RACI, the team and the plan** · owner: Delivery lead (project manager) · Week 2 → RACI, staffing plan, dated delivery plan and risk register.
- [ ] **0.10 Build the business case** · owner: Business Analyst · Week 2 → Business case with an ROI measurement plan.
- [ ] **0.11 Discover the customer environment and open every access request** · owner: Forward Deployed Engineer · Week 1, in parallel with the interviews → Completed environment templates, a readiness report, an access and firewall request log with owners and tickets, and the agreed deployment mode.

**Gate: Gate 0 · Scope approved** (convened by Delivery lead (project manager); signed by Executive sponsor, Product owner (decision owner))

- [ ] Every discovery question has a confirmed answer with a named owner.
- [ ] The baseline is measured from real records.
- [ ] The decision that AI is (or is not) warranted is recorded with its reasons.
- [ ] Requirements and acceptance criteria are approved, and the out-of-scope list exists.
- [ ] The risk tier and its approval path are confirmed by risk and compliance.
- [ ] The RACI is agreed and every role has a named person.
- [ ] The business case is approved and the next phase is funded.

### Phase 1: Architecture and design (Weeks 2–4)

Goal: Turn the approved requirements into a design that fits your enterprise, meets its non-functional targets and can be built, tested, released and rolled back.

Lead: Solution Architect · Accountable: Solution Architect

- [ ] **1.1 Place the system in your enterprise landscape** · owner: Solution Architect · Week 2 → C4 context and container views and an integration matrix.
- [ ] **1.2 Fix the non-functional requirements and the latency budget** · owner: Solution Architect · Week 2 → NFR matrix with a per-stage latency budget.
- [ ] **1.3 Choose the model strategy and the human-oversight points** · owner: AI Architect · Weeks 2–3 → Model strategy and oversight design, recorded as a decision record.
- [ ] **1.4 Design the high-level architecture and the fallback ladder** · owner: Solution Architect · Week 3 → High-level design, sequence diagram and fallback ladder.
- [ ] **1.5 Write the low-level design** · owner: ML Engineer · Weeks 3–4 → Low-level design: API contract, data model and event schema, reviewed by its consumers.
- [ ] **1.6 Design the data architecture and draft the data contracts** · owner: Data Engineer · Weeks 3–4 → Data architecture and draft data contracts.
- [ ] **1.7 Threat-model the design** · owner: Security Engineer · Week 3 → Threat model and security requirements.
- [ ] **1.8 Size capacity and cost** · owner: Inference Engineer · Week 3 → Capacity and cost model inside the business case.
- [ ] **1.9 Define environments, the release path and the SLOs** · owner: MLOps Engineer · Weeks 3–4 → Release and environment design, and an SLO document.
- [ ] **1.10 Write the test strategy** · owner: QA / Test Engineer · Week 4 → Test strategy with a traceability matrix.
- [ ] **1.11 Record the decisions and hold the architecture review** · owner: Solution Architect · Week 4 → Decision records and architecture review minutes with actions.
- [ ] **1.12 Specify every integration and prove the environment can carry it** · owner: Forward Deployed Engineer · Week 4 → An integration specification per hop with sequence diagrams and tests, the adapter selection, and a readiness report for the target environment.

**Gate: Gate 1 · Design approved** (convened by Delivery lead (project manager); signed by Solution Architect, AI Architect, Security Engineer, Product owner (decision owner))

- [ ] Context, container, high-level, sequence and low-level designs are reviewed.
- [ ] The stage budgets add up to the p99 latency target.
- [ ] Every non-functional requirement has a target and a test that will prove it.
- [ ] Every threat has a control and named evidence.
- [ ] Capacity and cost fit inside the business case.
- [ ] The release path, the SLOs and the rollback mechanism are defined.
- [ ] Every acceptance criterion traces to a test.
- [ ] Significant decisions are recorded.

### Phase 2: Data (Weeks 3–7)

Goal: Get lawful access to the data, prove it is fit for purpose, and turn it into reproducible, leak-free datasets and feature pipelines.

Lead: Data Engineer · Accountable: Data owner (data steward)

- [ ] **2.1 Get access and sign the agreements** · owner: Forward Deployed Engineer · Week 3 → Access approvals, signed data contracts, the privacy impact assessment and a customer-environment checklist with every blocker owned.
- [ ] **2.2 Profile the data** · owner: Data Analyst · Weeks 3–4 → Data profiling report and a quality issues log.
- [ ] **2.3 Write the source-to-target mapping** · owner: Data Analyst · Week 4 → Source-to-target mapping that reconciles to a trusted report.
- [ ] **2.4 Define the label and the prediction point** · owner: Data Scientist · Week 4 → Label specification approved by the domain expert.
- [ ] **2.5 Build the ingestion pipelines** · owner: Data Engineer · Weeks 4–6 → Ingestion pipelines running in development, with lineage.
- [ ] **2.6 Add automated data-quality gates** · owner: Data Engineer · Weeks 5–6 → Automated quality checks that block bad data, and a dashboard.
- [ ] **2.7 Build the features, correct as of the prediction time** · owner: Data Engineer · Weeks 5–7 → Feature pipelines and feature definitions, with a test that proves no feature uses future data.
- [ ] **2.8 Create the training, validation and test datasets** · owner: Data Scientist · Weeks 6–7 → Versioned datasets with a dataset card, reproducible from code.
- [ ] **2.9 Explore the data and confirm the signal** · owner: Data Scientist · Weeks 6–7 → Exploration report with signal and leakage findings.

**Gate: Gate 2 · Data ready** (convened by Delivery lead (project manager); signed by Data owner (data steward), Data Scientist, Security Engineer)

- [ ] Access is approved for this purpose and the data contracts are signed.
- [ ] Quality checks are automated and passing.
- [ ] The label definition is approved by the domain expert.
- [ ] A test proves no feature uses information from after the prediction time.
- [ ] Datasets are versioned and can be rebuilt from code.
- [ ] The signal is confirmed against the baseline, or the work has gone back to Gate 0.

### Phase 3: Model and application build (Weeks 5–10)

Goal: Build a baseline, beat it with a candidate, and turn the result into packaged, reproducible, callable software inside the user’s workflow.

Lead: Data Scientist · Accountable: AI Architect

- [ ] **3.1 Set up the repository, CI and experiment tracking** · owner: MLOps Engineer · Week 5 → Repository, CI, experiment tracking and model registry.
- [ ] **3.2 Run the starter kit and build the baseline** · owner: Data Scientist · Weeks 5–6 → Baseline with an evaluation report: the number every later model must beat.
- [ ] **3.3 Build the candidate model** · owner: Data Scientist · Weeks 6–8 → Candidate model, experiment log and error analysis.
- [ ] **3.4 Evaluate, calibrate and set the operating point** · owner: Data Scientist · Week 8 → Evaluation report and an operating point signed by the decision owner.
- [ ] **3.5 Package the model and build the training pipeline** · owner: ML Engineer · Weeks 7–9 → Reproducible training pipeline and a registered model.
- [ ] **3.6 Build the serving path** · owner: ML Engineer · Weeks 7–9 → Inference service running in development, with its fallbacks.
- [ ] **3.7 Optimise inference** · owner: Inference Engineer · Weeks 8–9 → Performance report: the latency budget is met at the planned cost.
- [ ] **3.8 Build the application and the human-in-the-loop** · owner: AI Engineer · Weeks 8–10 → Application integrated into the workflow, with feedback capture.
- [ ] **3.9 Build the evaluation harness and the guardrails** · owner: AI Engineer · Weeks 9–10 → Evaluation harness in CI and guardrails in the request path.
- [ ] **3.10 Write the model card** · owner: Data Scientist · Week 10 → Model card and, where required, the governance submission.

**Gate: Gate 3 · Build complete** (convened by Delivery lead (project manager); signed by AI Architect, Product owner (decision owner), Data Scientist)

- [ ] The candidate beats the baseline on the untouched test set by the agreed margin, or the baseline is what ships.
- [ ] The operating point is approved by the decision owner.
- [ ] The training pipeline reproduces the metrics from a clean checkout.
- [ ] Serving meets the latency budget in development.
- [ ] The fallback ladder is implemented and tested.
- [ ] The evaluation harness runs in CI.
- [ ] The model card is complete.

### Phase 4: Platform, security and verification (Weeks 8–12)

Goal: Prove, in an environment that resembles production, that the system meets its requirements, is secure, can be observed, and can be rolled back.

Lead: QA / Test Engineer · Accountable: Delivery lead (project manager)

- [ ] **4.1 Provision the environments as code** · owner: Platform Engineer · Weeks 8–9 → Staging and production environments created from code.
- [ ] **4.2 Build the deployment pipeline** · owner: MLOps Engineer · Weeks 9–10 → Deployment pipeline with promotion gates and rollback.
- [ ] **4.3 Instrument observability** · owner: SRE / DevOps Engineer · Weeks 9–11 → Dashboards, alerts and a prediction log.
- [ ] **4.4 Run functional, contract and integration tests** · owner: QA / Test Engineer · Weeks 9–11 → Test report and automated suites.
- [ ] **4.5 Load-test and inject faults** · owner: QA / Test Engineer · Weeks 10–11 → Performance and resilience report.
- [ ] **4.6 Test security and give sign-off** · owner: Security Engineer · Weeks 10–11 → Security test report and sign-off.
- [ ] **4.7 Review responsible AI and compliance** · owner: Risk, compliance, legal and privacy · Week 11 → Compliance evidence pack and approvals.
- [ ] **4.8 Run user acceptance testing** · owner: Business Analyst · Weeks 11–12 → Acceptance test report signed by the product owner.
- [ ] **4.9 Write the runbooks and train support** · owner: SRE / DevOps Engineer · Weeks 11–12 → Runbooks, on-call rota and trained support.
- [ ] **4.10 Rehearse rollback and disaster recovery** · owner: SRE / DevOps Engineer · Week 12 → Rollback and recovery rehearsal record, with timings.
- [ ] **4.11 Run customer acceptance testing and plan adoption** · owner: Forward Deployed Engineer · Weeks 12–13 → Signed customer acceptance, a defect and exception log, training records and an adoption plan.

**Gate: Gate 4 · Ready for release** (convened by Delivery lead (project manager); signed by QA / Test Engineer, Security Engineer, SRE / DevOps Engineer, Product owner (decision owner))

- [ ] Every acceptance criterion passes.
- [ ] No critical or high defect or vulnerability is open.
- [ ] The load test meets the non-functional targets at peak.
- [ ] Every failure scenario has an alert and a runbook, and has been exercised.
- [ ] Rollback has been rehearsed and timed.
- [ ] User acceptance is signed.
- [ ] The compliance approvals are in hand.

### Phase 5: Release and deployment (Weeks 12–14, with hypercare to week 16)

Goal: Put the system in front of real traffic gradually, prove the business effect with a planned experiment, and hand a working service to operations.

Lead: MLOps Engineer · Accountable: Product owner (decision owner)

- [ ] **5.1 Prepare the business change** · owner: Business Analyst · Week 12 → Users trained, communication sent, procedures updated.
- [ ] **5.2 Plan the cut-over and the experiment** · owner: MLOps Engineer · Week 12 → Rollout and experiment plan, written before any traffic moves.
- [ ] **5.3 Hold the go/no-go review** · owner: Product owner (decision owner) · Week 12 → Recorded go/no-go decision and an approved change request.
- [ ] **5.4 Deploy to production with no user impact** · owner: Forward Deployed Engineer · Week 12 → Production deployment verified, with users still on the old path.
- [ ] **5.5 Run in shadow** · owner: MLOps Engineer · Weeks 12–13 → Shadow report: production behaves as offline evaluation predicted.
- [ ] **5.6 Canary, then ramp** · owner: MLOps Engineer · Weeks 13–14 → Ramp log with the decision taken at each step.
- [ ] **5.7 Measure the business effect** · owner: Data Scientist · Weeks 13–16, once labels mature → Experiment readout.
- [ ] **5.8 Run hypercare and hand over to operations** · owner: Forward Deployed Engineer · Weeks 14–16 → Production handover package and a signed acceptance record: the service is accepted by operations.
- [ ] **5.9 Close the release** · owner: Delivery lead (project manager) · Week 16 → Release record and retrospective actions.

**Gate: Gate 5 · Live and accepted** (convened by Delivery lead (project manager); signed by Product owner (decision owner), SRE / DevOps Engineer, Executive sponsor)

- [ ] The planned share of traffic has been served inside the SLO for the agreed period.
- [ ] No guardrail metric was breached.
- [ ] The experiment readout is delivered.
- [ ] Rollback stayed available throughout the ramp.
- [ ] Operations has accepted the handover.
- [ ] The release evidence is archived.

### Phase 6: Operate, monitor and improve (From week 14, continuously)

Goal: Keep the service reliable, the model accurate, the cost under control and the benefit visible, for as long as the system runs.

Lead: SRE / DevOps Engineer · Accountable: Product owner (decision owner)

- [ ] **6.1 Watch service health** · owner: SRE / DevOps Engineer · Continuously, reviewed daily → SLO report.
- [ ] **6.2 Monitor data quality and drift** · owner: MLOps Engineer · Every pipeline run, reviewed daily → Drift and data-quality dashboard with alerts.
- [ ] **6.3 Monitor model performance** · owner: Data Scientist · As labels mature, reviewed weekly → Weekly model performance review.
- [ ] **6.4 Track business value and adoption** · owner: Business Analyst · Monthly, with a quarterly value review → Benefit report against the baseline.
- [ ] **6.5 Control the cost** · owner: Inference Engineer · Monthly → Cost report and optimisation actions.
- [ ] **6.6 Handle incidents and learn from them** · owner: SRE / DevOps Engineer · Whenever an alert fires → Incident record and review actions.
- [ ] **6.7 Retrain, challenge and roll back** · owner: MLOps Engineer · On a trigger: drift, a performance drop, a schedule or a data change → Retraining record: a new champion, or a documented rejection.
- [ ] **6.8 Keep security and compliance current** · owner: Security Engineer · Continuous scanning, quarterly access review, periodic model review → Compliance evidence log.
- [ ] **6.9 Collect feedback and manage the backlog** · owner: Product owner (decision owner) · Every sprint → Prioritised backlog.
- [ ] **6.10 Review the service: continue, change or retire** · owner: Product owner (decision owner) · Quarterly → Quarterly service review decision.
- [ ] **6.11 Coordinate customer-side incidents and change windows** · owner: Forward Deployed Engineer · Continuous, reviewed monthly → An incident and change log for customer-side events, current environment documentation and a monthly report to the product owner.

**Gate: Gate 6 · Quarterly service review** (convened by Product owner (decision owner); signed by Product owner (decision owner), Executive sponsor)

- [ ] The SLOs were met, or the error-budget policy was applied.
- [ ] Model performance is inside the agreed band, or a retrain has been done.
- [ ] The realised benefit is reported against the baseline.
- [ ] Incidents are reviewed and their actions closed.
- [ ] Cost is inside the budget.
- [ ] The compliance evidence is current.
