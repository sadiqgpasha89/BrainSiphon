# Real-Time Card & UPI Fraud Detection: delivery plan

> Generated from the blueprint `fintech/real-time-card-upi-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Card & UPI Fraud Detection · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** advanced

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 22–30 engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.

**Skills the team needs**

- pandas and NumPy fluency, including time-indexed data and as-of joins
- scikit-learn: pipelines, probability calibration, PR-AUC and ROC curves on imbalanced data
- Gradient boosting (LightGBM, XGBoost or sklearn HistGradientBoosting) and why it overfits when you have a few hundred positives
- Reading a confusion matrix as money: cost of a missed fraud versus cost of a declined genuine customer

**Tools**

- Python 3.11+ with numpy, pandas, scikit-learn (requirements.txt in the starter)
- A feature store or Redis for M5 (Feast, Tecton or plain Redis hashes with TTLs)
- k6 or Locust for the M5 load test

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Frame the decision and set the operating point | 1-2 | - Write the cost matrix: cost of a missed fraud (amount plus dispute fee plus churn risk) against the cost of a declined genuine customer (lost margin plus complaint plus churn)<br>- Turn it into one operating constraint, for example false declines under 0.3% of genuine volume, and a review capacity in alerts per day<br>- Agree the label definition and its delay with the risk team, and decide what happens to a transaction when the model is unavailable (fail open or closed) | One-page decision spec with the cost matrix, operating point, SLA and kill criteria | Operating point: A written FPR or false-decline ceiling plus a named owner who signed it (Review with risk and product; no modelling starts before this exists) |   |   |   |
| M1 | Get data and fix the label and split | 3-4 | - Run python make_data.py (or load a public set) and confirm the fraud rate and the label delay<br>- Write the split down: train before day 45, validate days 45-59, leave a 21-day maturity gap, test from day 80<br>- Add the data-quality checks: no null card ids, timestamps monotone per card, amounts positive, fraud rate inside a sane band | Reproducible dataset snapshot and a written split definition | Generator and split tests: pytest -k 'deterministic or matured' passes; fraud rate between 0.2% and 1.2% (Run pytest in the starter directory) |   |   |   |
| M2 | Point-in-time features | 4-5 | - Implement card velocity over 1 minute, 1 hour and 24 hours with windows that close strictly before the decision time<br>- Implement device-to-card fan-out as a stateful class and reuse the same class for training replay and serving<br>- Compute merchant fraud rates only from labels that had arrived by the decision time, over 7 and 90 days | features.py with an as-of guarantee and the future-truncation test in CI | Leakage test: Deleting all rows after day 60 changes no feature of any earlier row (max absolute difference 0) (pytest -k only_the_past) |   |   |   |
| M3 | Calibrated baseline | 2-3 | - Fit a log-scaled logistic regression with isotonic calibration on the training window only<br>- Report PR-AUC and recall at 0.5% FPR on the test window, never accuracy or ROC-AUC<br>- Write down the baseline number; every later model has to beat it | Baseline model, metric report and the number to beat | Recall at 0.5% FPR and PR-AUC on the starter data: Recall at 0.5% FPR at least 0.60 and PR-AUC at least 0.55 (starter reaches 0.74 and 0.69). On your own data: at least the recall your current rules reach at the same FPR (python baseline.py, then pytest -k clears_the_gate) |   |   |   |
| M4 | Challenger model and error analysis | 3-4 | - Train a gradient-boosted model with strong regularisation (depth 3, 100+ rows per leaf) because you have only a few hundred positives<br>- Bootstrap over cards, not rows, to get a confidence interval on the lift over the baseline<br>- Read the 50 highest-scoring genuine rows and the 50 lowest-scoring frauds by hand and write what they have in common | Challenger artifact, evaluation report with intervals and an error-analysis note | PR-AUC lift of challenger over baseline: Starter: challenger PR-AUC at least 0.95 times baseline (it reaches 1.08 times). Real data: lower bound of the 95% card-level bootstrap interval above 0 (python baseline.py; compare the two reported blocks) |   |   |   |
| M5 | Serving path and degradation ladder | 6-8 | - Serve the model in-process behind the gateway with the feature lookup on a per-request deadline and the 8 ms budget split across stages<br>- Implement the degradation ladder: stale features, then last-known-good model, then versioned rules, then caller-side default<br>- Log every decision with the model version, feature snapshot and degradation level to the event bus without blocking the response | Scoring service, runbook per ladder rung and a load-test report | Latency and failure behaviour: p99 at most 8 ms at 1.5 times provisioned peak, and each injected dependency failure lands on the next ladder rung with no unhandled error (k6 or Locust load test plus the fault-injection game-day in the test plan) |   |   |   |
| M6 | Shadow, canary and ramp | 3-4 | - Shadow for 7 days: score live traffic, take no action, compare with the baseline and with analyst outcomes<br>- Canary at 1%, 5%, 25% and 100% with automatic rollback on the false-decline guardrail<br>- Keep a permanent control group so lift stays measurable after launch | Launch review with measured lift, guardrail status and sign-off from product, risk and SRE | Guardrail and lift: False-decline rate no more than 0.05 percentage points above the baseline at every canary step, and fraud basis points below the control group by the target set in M0 (Dashboards on the decision log; read against the held-out control) |   |   |   |

## Decisions to take

**Which model should serve the first release?**

| Option | Choose When |
|---|---|
| Calibrated logistic regression | You have a few hundred positives, need instant reason codes, or the regulator wants coefficients; ship this first and keep it as the fallback rung |
| Gradient-boosted trees (LightGBM or XGBoost) | You have thousands of positives and a bootstrap interval that shows lift over the baseline; add monotone constraints where policy requires them |
| Graph neural network embeddings | Mule rings are your dominant loss and a simple device fan-out feature has already been exhausted; precompute embeddings off the request path |

*Default:* Logistic regression to shadow, gradient boosting as the challenger; graph features only after error analysis points at rings

*Decision and date:* ____________

**Where do features live?**

| Option | Choose When |
|---|---|
| Compute inside the scoring service from a small state store | The state is a few counters per card and device and you want the lowest latency and the fewest moving parts |
| A managed feature store with online and offline views | Many models share features and you need point-in-time backfills for training; accept an extra network hop in the budget |

*Default:* In-process state with Redis for the first release; adopt a feature store when a second model needs the same features

*Decision and date:* ____________

**Fail open or fail closed when the whole service is down?**

| Option | Choose When |
|---|---|
| Fail open with sampled post-hoc review | Declining good customers costs more than the expected fraud during an outage |
| Fail closed or step-up authentication | Exposure per transaction is high, such as high-value or card-not-present flows |

*Default:* Decide per merchant category and amount band in M0, not during an incident

*Decision and date:* ____________

## Pitfalls, by milestone

| At | Mistake | Symptom | Fix |
|---|---|---|---|
| M1 | Labelling everything not yet reported as a genuine transaction | Offline recall looks fine but recent weeks of live fraud are missed, because recent frauds were trained as negatives | Train only on rows whose label window has closed and keep a maturity gap before the test period |
| M2 | Computing a rolling window that includes the current transaction or later rows | Offline PR-AUC above 0.95 that collapses to the baseline in shadow | Close windows strictly before the decision time and keep the future-truncation test in CI |
| M2 | Merchant risk computed from today's chargebacks | The model memorises merchants and the feature looks magical offline, then decays as labels mature | Use only labels whose arrival time is before the decision time, as merchant_matured_rate does |
| M3 | Reporting accuracy or ROC-AUC | A model that approves everything scores 99.6% accuracy and ROC-AUC above 0.95 while catching nothing useful | Report PR-AUC and recall at the fixed FPR the business agreed in M0 |
| M4 | Letting a boosted model overfit a few hundred positives | In the starter, an unregularised depth-4 model scored PR-AUC 0.33 against a baseline of 0.69 | Regularise hard, validate chronologically and demand a bootstrap interval before promoting the challenger |
| M5 | Computing features differently in training and in the scoring service | Live score distribution drifts away from offline within days of launch | Share one implementation (the DeviceFanOut class pattern) and run the skew replay test in CI |
| M6 | Ramping on fraud caught alone | Fraud losses fall while complaints and abandoned checkouts rise | Make the false-decline rate an automatic rollback guardrail at every canary step |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Future-truncation leakage test | pytest test_features_use_only_the_past | No feature of any past row changes when all later rows are deleted |   |
| Window boundary test | pytest test_velocity_windows_exclude_the_current_event | A 61-second-old event is outside a 1-minute window and the current event is never counted |   |
| Label maturity guard | pytest test_training_rows_have_matured_labels | Every training label arrived before the first test row and training stops one maturity window before the test period |   |
| Model gate | pytest test_baseline_clears_the_gate_and_challenger_earns_its_complexity | Baseline recall at 0.5% FPR at least 0.60 and PR-AUC at least 0.55; challenger PR-AUC at least 0.95 times baseline |   |
| Train and serve skew replay | Replay 1,000 logged production events through the serving code and through features.py | Maximum absolute difference per feature is 0 (or within a documented rounding tolerance) |   |
| Slice and calibration check | Report recall at 0.5% FPR and a 10-bin reliability table per merchant category and new versus returning cardholder | No slice with 200 or more transactions drops below half the overall recall, and each calibration bin is within 0.2 percentage points of the observed rate |   |
| Load test at 1.5× provisioned peak | k6 or Locust replaying production-shaped traffic | p99 stays under 8 ms at 3.3K req/s with zero errors outside the degradation ladder |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on PR-AUC at 0.5% FPR.
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "Flash-sale traffic spike".
- [ ] Week 3 — 1% canary with an automatic rollback on "False-decline rate on good customers"; read "Fraud basis points per volume" against a held-out control group.
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
