# Sepsis Early-Warning System: delivery plan

> Generated from the blueprint `healthcare/sepsis-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sepsis Early-Warning System · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 29–38 engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.

**Skills the team needs**

- Time-series feature engineering on irregularly sampled data: forward-fill, slopes, counts and time since last measurement
- Clinical vocabulary: Sepsis-3, SOFA and qSOFA, SIRS, lactate, and the difference between order time, draw time and result time
- Patient-grouped evaluation and why a random row split leaks, plus alert-burden metrics such as alerts per 100 patient-days
- Working with clinicians: agreeing an alert budget, reviewing missed cases with them, and the basics of medical-device change control

**Tools**

- Python 3.11+ with numpy, pandas, scikit-learn (requirements.txt in the starter)
- Access to de-identified ICU data (PhysioNet credentialed access) for the real-data run
- An HL7 FHIR or EHR feed and a stream processor (Flink or similar) for M5

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Agree the clinical question and the alert budget | 2-3 | - Define onset (Sepsis-3 with adjudicated times), the prediction horizon (alert 1-24 hours ahead) and what counts as a useful alert<br>- Agree an alert budget with nursing leadership, for example no more than 10 alerts per 100 patient-days, and a refractory period after each alert<br>- Write down who receives an alert, what they do with it and how they record the response, because that response is your future label | Clinical decision spec: onset definition, horizon, alert budget, recipient and response workflow | Alert budget and onset definition: Signed by a named clinical owner before any modelling; the budget is a number, not 'low' (Review meeting with the unit's physician and nurse leads) |   |   |   |
| M1 | Data, labels and a patient-level split | 4-5 | - Build the hourly table from vitals, labs (with result time) and onset; run python make_data.py or load the PhysioNet 2019 files<br>- Split by patient into 60% train, 20% validation and 20% test and assert no patient appears twice<br>- Check prevalence per hour and per stay, and that the censoring rule removes every hour at or after onset | Reproducible hourly dataset and a patient-level split manifest | Generator, prevalence and split tests: pytest -k 'deterministic or share_no_patient' passes; 5-14% of stays septic (Run pytest in the starter directory) |   |   |   |
| M2 | Features that respect result time | 5-6 | - Forward-fill charted vitals from past readings only and place each lab at its result hour, not its draw hour<br>- Add 3-hour slopes, 6-hour lactate trend, measurement counts and composite SIRS and qSOFA scores<br>- Write the future-truncation test and a result-time test, and run them in CI | features.py with tests that fail if any feature sees the future | Leakage tests: Features for hours up to H are identical whether or not later hours exist, and a lab is invisible before its result hour (pytest -k 'only_the_past or result_hour') |   |   |   |
| M3 | Baseline: fixed-threshold early-warning score | 2-3 | - Implement the points-based score from heart rate, respiratory rate, systolic pressure and temperature<br>- Choose the alert threshold on the validation patients so the burden stays within the agreed budget<br>- Report sensitivity, median lead time and alerts per 100 patient-days on the test patients | Baseline report: the number the learned model has to beat at the same burden | Baseline at the agreed burden: At most 11 alerts per 100 patient-days on the test patients (starter baseline: 10.0 alerts, 62% sensitivity, 2 h median lead) (python baseline.py) |   |   |   |
| M4 | Gradient-boosted model at the same burden | 4-5 | - Train a regularised gradient-boosted model on hours before onset only, with the threshold again chosen on validation patients<br>- Compare at equal burden with an interval from bootstrapping patients, because a test set of about 50 septic patients is small<br>- Review every missed septic patient and every false alert with a clinician and write down the pattern | Model artifact, comparison at equal burden with intervals and a missed-case review | Sensitivity and lead time versus baseline at equal burden: Starter: burden within 11 per 100 patient-days, sensitivity at least 10 points above the baseline and median lead time at least equal (it reaches 98% and 3 h at 6.1 alerts). Real data: patient-level bootstrap lower bound of the sensitivity gain above 0 (python baseline.py; pytest -k beats_the_fixed_threshold) |   |   |   |
| M5 | Streaming integration and alert delivery | 8-10 | - Consume the FHIR or HL7 stream, normalise units at ingest with range checks, and compute the same features with the same code in the stream job<br>- Score hourly or on each new observation within the latency budget and deliver the alert to the EHR in-basket with the top contributing signals<br>- Log every score with the model version and the feature snapshot, and record the clinician's response as the feedback label | Streaming scorer, alert integration, runbook and a replay test against historical data | Replay parity and latency: Replaying a month of historical data through the stream job reproduces the batch scores within rounding, with p99 scoring latency inside the budget (Replay harness plus the load test in the test plan) |   |   |   |
| M6 | Silent mode, then staged go-live | 4-6 | - Run silently for at least 4 weeks: score live patients, show nobody, and measure burden and lead time against adjudicated cases<br>- Go live on one unit with a burden dashboard and a cap per shift, and change thresholds only in staged steps<br>- File the change-control record (intended use, validation evidence, monitoring plan) for the regulator if the system is a medical device | Silent-mode report, unit go-live decision and change-control file | Silent-mode burden and sensitivity: Alerts per 100 patient-days within the agreed budget on live data and adjudicated sensitivity not below the baseline's at that burden (Burden dashboard and case adjudication with the clinical owner) |   |   |   |

## Decisions to take

**How should you handle missing and irregularly sampled vitals?**

| Option | Choose When |
|---|---|
| Forward-fill with an age feature and a count of recent readings | You want a simple model that is easy to audit and a fast streaming implementation; cap how stale a value may be |
| A sequence model that takes values, masks and time gaps (GRU-D style) | Forward-fill features plateau and error analysis shows the irregular timing itself carries signal; budget for the harder validation |

*Default:* Forward-fill with age and counts; try a sequence model only after reviewing the missed cases

*Decision and date:* ____________

**Which metric do you optimise and report?**

| Option | Choose When |
|---|---|
| Sensitivity and lead time at a fixed alert burden | A ward has a finite attention budget, which is almost always |
| AUROC or AUPRC over all hours | Only as a secondary view during model development; it rewards late and easy alerts |

*Default:* Lead time and sensitivity at the M0 burden, reported with patient-level intervals

*Decision and date:* ____________

**One global threshold or per-unit thresholds?**

| Option | Choose When |
|---|---|
| One global threshold | A single hospital with similar wards and a small number of septic cases per unit |
| Per-unit thresholds calibrated to each unit's burden | Units differ in acuity and charting habits and you have enough alerts per unit to calibrate |

*Default:* Global threshold first; move to per-unit only when burden dashboards show persistent imbalance

*Decision and date:* ____________

## Pitfalls, by milestone

| At | Mistake | Symptom | Fix |
|---|---|---|---|
| M1 | Splitting rows at random instead of patients | Excellent offline metrics from a model that has memorised each patient's baseline | Split by patient id and keep the no-shared-patient test in CI |
| M1 | Training on hours after onset | The model learns that treated patients look sick; it scores well offline and adds no early warning | Censor every hour at or after onset |
| M2 | Using lab draw time instead of result time | Lead time looks 1-2 hours better offline than the ward can ever achieve | Place each lab at its result hour and keep the result-time test |
| M2 | Using antibiotic orders or diagnosis text as features | Near-perfect scores that vanish when the feature is removed, because clinicians ordered after suspecting sepsis | Keep order-time and free-text fields out of the feature list; the leaky-column test enforces it |
| M3 | Comparing models at different alert burdens | A model looks better only because it alerts more often | Choose each threshold on validation patients to hit the same burden, then compare on the test patients |
| M4 | Trusting a metric from about 50 septic test patients | 98% sensitivity swings by several points with a different split seed | Bootstrap patients for intervals, repeat over seeds and report the interval, not the point estimate |
| M6 | Changing the threshold quickly after complaints | Alert volume oscillates and clinicians start ignoring alerts | Change thresholds in staged steps with a burden dashboard and a cap per shift |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Patient-level split | pytest test_train_valid_test_share_no_patient | No patient id appears in more than one of train, validation and test |   |
| Leaky columns excluded | pytest test_leaky_columns_are_not_features | abx_ordered, onset_hour, the labels and the raw lab columns are not in the feature list |   |
| Future-truncation leakage test | pytest test_features_use_only_the_past | Features for hours up to H are identical with and without later hours for five sampled stays |   |
| Lab result-time test | pytest test_lactate_appears_only_after_its_result_hour | A lactate drawn at hour 5 and resulted at hour 7 is invisible at hour 6 and visible from hour 7 |   |
| Burden-matched model comparison | pytest test_model_beats_the_fixed_threshold_score_at_the_same_alert_burden | Both policies within 11 alerts per 100 patient-days; the model is at least 10 points more sensitive with equal or longer median lead time |   |
| Unit and range checks at ingest | Schema validation on the FHIR feed with per-unit physical ranges | A lactate reported in mg/dL instead of mmol/L is rejected or converted, and out-of-range values never reach the model |   |
| Silent-mode shadow comparison | Live scoring with alerts suppressed, joined to adjudicated cases weekly | Burden and sensitivity match the offline report within the interval agreed in M0 |   |
| Load test at 1.5× provisioned peak | k6 or Locust replaying production-shaped traffic | p99 stays under 80 ms at 7.5K req/s with zero errors outside the degradation ladder |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on Lead time at 0.5 alerts per 100 patient-days.
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "New lab analyser changes units".
- [ ] Week 3 — 1% canary with an automatic rollback on "Sepsis mortality and alert override rate"; read "Time to antibiotics after alert" against a held-out control group.
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
