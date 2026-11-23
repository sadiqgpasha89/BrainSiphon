# Wind Turbine Gearbox Anomaly Detection: delivery plan

> Generated from the blueprint `energy/wind-turbine-gearbox-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wind Turbine Gearbox Anomaly Detection · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 24–32 engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.

**Skills the team needs**

- Time-ordered validation, windowed features and forecasting or anomaly metrics
- The vocabulary of Energy & Utilities: section 1 lists what to learn first
- Reading and extending the "Anomaly detection on seasonal metrics" reference kit

**Tools**

- Python 3.11+ with numpy, pandas, scikit-learn, scipy and pytest (about 10 seconds)
- The production stack named in the blueprint, or your platform's equivalent: turbine controllers; signal processing; normal-behaviour model

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Frame the decision and the success contract | 2-3 | - Write down the decision this system supports and who acts on it: Detect early gearbox and bearing deterioration in wind turbines from SCADA and vibration data so repairs are planned before major component failures.<br>- Turn each constraint into a number with an owner: Baselines per turbine and operating state; False alarms under 1 per turbine per quarter; Alerts include the component and trend; Weekly run for 8K turbines<br>- Fix the launch metric "Major component failures", the guardrail "Crane cost" and the kill criteria that revert the launch | One-page decision spec: owner, cost of each kind of error, constraints as numbers, launch and kill criteria | Decision spec: Signed spec with a number for every constraint and for "Major component failures" and "Crane cost" before modelling starts (Review with the owner of the decision) |   |   |   |
| M1 | Data, labels and a split that cannot leak | 3-4 | - Inventory the sources behind "Gearbox temperature residual", "Vibration spectral features", "Oil particle and filter data"; give each an owner, a schema contract and a freshness target<br>- Define the label exactly and measure its delay. The trap to design around first: Global alarm limits.<br>- Split the way the data will be used (by time and by entity), and run the reference kit's generator to see the same problem on synthetic data | Reproducible dataset snapshot, a written label definition and a split manifest | Generator tests: pytest -k deterministic passes; anomalies between 0.5% and 8% of points and benign calendar events above 1%. On your data: the label definition is signed off and no entity or time overlap exists between train and test (Run pytest in the kit directory) |   |   |   |
| M2 | Signals in, noise out | 4-5 | - Implement the high-signal features: Gearbox temperature residual (difference between measured and expected temperature); Vibration spectral features (energy at gear and bearing frequencies); Oil particle and filter data (particle counts and filter pressure); Operating state (power, speed and ambient temperature)<br>- Leakage review for each: Gearbox temperature residual - State-conditioned; Vibration spectral features - From condition monitoring; Oil particle and filter data - From sensors<br>- Delete the noise on purpose: Turbine name (an identifier); Alarm text (vendor wording); Maintenance crew name (irrelevant). Map your features onto the reference kit's slots: "Gearbox temperature residual" ↔ seasonal residual; "Vibration spectral features" ↔ robust spread; "Oil particle and filter data" ↔ calendar flag | Feature spec with owners and as-of semantics, plus a test that fails if any feature sees the future | No-future test: Corrupting every value after hour t (set to 1,000,000) changes no score before t (maximum absolute difference 0) (pytest -k only_the_past) |   |   |   |
| M3 | Baseline first | 2-3 | - Build the baseline: Alarm limits from the turbine manufacturer on temperature and vibration, because they are the default.<br>- Report Detection lead time on past failures; False alarms per turbine-quarter; Component localisation accuracy on held-out data, and the same numbers for the dumbest reasonable alternative<br>- Write the baseline numbers down; every later claim is a delta against them | Baseline model, metric report and the number to beat | Recall and false alerts at the alert budget: Rolling z-score recorded as the number to beat (the kit: recall 0.48 at 0.27 false alerts per series-week). On your data: record "Detection lead time on past failures" for the baseline with an interval (python baseline.py) |   |   |   |
| M4 | The production model, judged against the baseline | 4-5 | - Build the production design: A state-conditioned residual model per turbine with trend tests, vibration feature checks and a lead-time estimate feeding crane and parts planning.<br>- Compare with the baseline on Detection lead time on past failures; False alarms per turbine-quarter; Component localisation accuracy, using intervals and several seeds<br>- Read the largest errors by hand with a domain expert and write down what they have in common | Challenger artifact, comparison report with intervals and an error-analysis note | Recall gain at the same budget: Calendar-aware seasonal detector recall at least 0.30 above the rolling z-score with false alerts at most 0.6 per series-week on held-out time (the kit: 0.95 at 0.50) (python baseline.py; pytest -k 'seasonal or calendar') |   |   |   |
| M5 | Serving path and degradation ladder | 6-8 | - Build the serving path: SCADA and vibration capture (165 ms) → State segmentation (660 ms) → Residual model (659 ms) → Trend test (247 ms) → Alert and lead time (247 ms) → Maintenance planning (247 ms); off the critical path: Feedback<br>- Propagate one deadline of 2500 ms through every hop and give each dependency its own timeout and breaker<br>- Implement the degradation ladder: staler features, a smaller model, rules, then a safe default, and log which rung served each request | Serving service, load-test report and a runbook per ladder rung | Latency and failure behaviour: p99 at most 2500 ms at 313 req/s (1.5 times peak) and every injected dependency failure lands on the next ladder rung with no unhandled error (Load test plus fault injection per dependency) |   |   |   |
| M6 | Shadow, canary and the first month | 3-4 | - Run in shadow for at least a week: score live traffic, take no action and compare with the baseline and with eventual outcomes<br>- Ramp 1% → 5% → 25% → 100% with automatic rollback on "Crane cost", reading "Major component failures" against a permanent control group<br>- Plan for the documented edge cases, starting with "Curtailment": State-aware baselines | Launch review with measured lift, guardrail status and sign-off from product, risk and operations | Guardrail and lift: "Crane cost" no worse than the baseline's at every ramp step, and "Major component failures" better than the control group by the target agreed in M0 (Dashboards on the decision log, read against the held-out control) |   |   |   |

## Decisions to take

**Ship "Alarm limits from the turbine manufacturer on temperature and vibration, because they are the default" first, or go straight to the production design?**

| Option | Choose When |
|---|---|
| Alarm limits from the turbine manufacturer on temperature and vibration, because they are the default | You need a working, explainable system quickly or have few labelled examples; it also stays in the system as the fallback rung |
| A state-conditioned residual model per turbine with trend tests, vibration feature checks and a lead-time estimate feeding crane and parts planning | The baseline plateaus on Detection lead time on past failures on held-out data and error analysis shows the remaining error is model-limited, not data- or label-limited |

*Default:* Ship the baseline to shadow first and promote the production design only when it beats the baseline on the launch metric after variance

*Decision and date:* ____________

**Which constraint should the design bind to first?**

| Option | Choose When |
|---|---|
| Baselines per turbine and operating state | This is the requirement that is hardest to retrofit; design the architecture and the launch gate around it first and give the others a budget once it is met |
| False alarms under 1 per turbine per quarter | This is the requirement that is hardest to retrofit; design the architecture and the launch gate around it first and give the others a budget once it is met |
| Alerts include the component and trend | This is the requirement that is hardest to retrofit; design the architecture and the launch gate around it first and give the others a budget once it is met |

*Default:* Start with "Baselines per turbine and operating state" and prove it in the load test and the launch review before optimising anything else

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
| M1 | Global alarm limits. | Offline results look better than live ones. The same mechanism on the reference kit: A rolling z-score finds 48% of events at the alert budget; a seasonal baseline finds 89%. | Add a test that fails when it happens, as the kit does (scores use only the past), and evaluate on a split that mirrors production |
| M3 | Counting alarms. | Offline results look better than live ones. The same mechanism on the reference kit: Without the calendar the seasonal detector has 0.78 false alerts per series-week on held-out time against a budget of 0.5; with it, 0.50 at higher recall. | Add a test that fails when it happens, as the kit does (alert refractory period), and evaluate on a split that mirrors production |
| M2 | Using "Turbine name" as a feature | It is noise: an identifier. | Keep it out of the feature list and assert the list in a test, so it cannot return silently |
| M2 | Using "Alarm text" as a feature | It is noise: vendor wording. | Keep it out of the feature list and assert the list in a test, so it cannot return silently |
| M3 | A global limit instead of normal behaviour per operating state and season | Temperature and load vary with wind and season. | Build the evaluation and the features around: Normal behaviour per operating state and season |
| M3 | Alarm counts instead of replayed past failures with lead time | Counts do not show detection. | Build the evaluation and the features around: Replayed past failures with lead time |
| M6 | Not planning for "Curtailment" | operating state is unusual for weeks. | State-aware baselines. |
| M6 | Not planning for "Sensor replacement" | the baseline shifts. | Change events reset the baseline. |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Scores use only the past | pytest test_scores_use_only_the_past | Setting every value after the cut-off to a huge number changes no earlier score |   |
| Alert refractory period | pytest test_alert_policy_respects_the_refractory_period | Consecutive threshold crossings produce one alert and alerts are at least 6 hours apart |   |
| Event-level evaluation arithmetic | pytest test_evaluation_counts_late_detection_delay_and_false_alerts | Recall, detection delay and false alerts per series-week match a hand-computed example |   |
| Seasonal baseline beats rolling z-score | pytest test_a_seasonal_baseline_finds_far_more_events_than_a_rolling_z_score | Recall at least 0.30 higher at the alert budget |   |
| Calendar events | pytest test_known_calendar_events_buy_recall_at_the_same_alert_budget | Calendar-aware detector has no more false alerts than the plain seasonal one and at least its recall |   |
| Offline metric agrees with an independent implementation | Recompute the headline metric in a second code path (a notebook or SQL) | "Detection lead time on past failures" matches to rounding on the held-out set |   |
| Edge-case replay: Curtailment | Replay a recorded or synthetic case through the full path | The system behaves as planned: State-aware baselines |   |
| Load test at 1.5× provisioned peak | k6 or Locust replaying production-shaped traffic | p99 stays under 2500 ms at 313 req/s with zero errors outside the degradation ladder |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on Detection lead time on past failures.
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "Curtailment".
- [ ] Week 3 — 1% canary with an automatic rollback on "Crane cost"; read "Major component failures" against a held-out control group.
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
