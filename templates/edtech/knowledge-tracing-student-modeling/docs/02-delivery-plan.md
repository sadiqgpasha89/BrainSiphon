# Knowledge Tracing & Student Modelling: delivery plan

> Generated from the blueprint `edtech/knowledge-tracing-student-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Knowledge Tracing & Student Modelling · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 25–34 engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.

**Skills the team needs**

- Logistic regression and gradient boosting, and probability calibration (reliability tables, expected calibration error)
- Sequence data handling: ordering by timestamp, event replay and per-user state
- Educational measurement basics: skills, item difficulty (IRT), guessing and slipping, forgetting
- Evaluation on new users: splitting by student and why a random row split leaks

**Tools**

- Python 3.11+ with numpy, pandas, scikit-learn (requirements.txt in the starter)
- An answer-event stream and a key-value store for learner state (Kafka and Redis) for M5
- A review workflow with teachers or learning scientists for M6

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Decide what mastery is for | 2-3 | - Name the decisions mastery drives (which question next, when to stop practising a skill, what the progress report says)<br>- Choose the target and metrics: next-answer AUC and RMSE on held-out students, plus calibration per skill<br>- Agree the budget: updating after every answer in under 30 ms for millions of learners | Spec of decisions, metrics, calibration requirement and latency budget | Spec exists: Signed by the learning-science lead and product owner, with a number for AUC, calibration error and p99 update latency (Review meeting) |   |   |   |
| M1 | Interaction table and a student-level split | 3-4 | - Build one row per answer ordered by student and timestamp; run python make_data.py or load a public log<br>- Split students, not rows: 75% of students for training, 25% held out entirely<br>- Deduplicate and verify timestamps are monotone per student | Ordered interaction table and a student split manifest | Generator and split tests: pytest -k 'deterministic or disjoint' passes: no student appears on both sides (Run pytest in the starter directory) |   |   |   |
| M2 | Learner state and point-in-time features | 4-5 | - Implement LearnerState so features are read before an answer is applied, and reuse it unchanged in the online service<br>- Add per-skill counts, a recency-weighted accuracy, time since practice and a recent overall accuracy<br>- Learn question difficulty from training students only and apply it to everyone | features.py with order-invariance and read-before-update tests | State and ordering tests: Features are identical whether rows arrive shuffled or in order, and the first read of a new skill shows no history (pytest -k 'read_before or timestamps') |   |   |   |
| M3 | Baselines: running accuracy and PFA | 2-3 | - Report the per-skill running accuracy as a predictor to show why raw scores are not mastery probabilities<br>- Fit a PFA-style logistic regression on prior correct, prior wrong and question difficulty<br>- Record AUC, RMSE and calibration error on held-out students | Baseline table and the number to beat | Calibrated baseline: PFA calibration error at most 0.03 and AUC at least 0.03 above the raw running accuracy (starter: ECE 0.0097 and AUC 0.626 against 0.580) (python baseline.py; pytest -k raw_running_accuracy) |   |   |   |
| M4 | Gradient-boosted tracer and the student-leak check | 4-5 | - Train a gradient-boosted model on all state features with skill as a categorical feature<br>- Add a student-id encoding on purpose and measure it under a random row split and a student split, to see the leak in numbers<br>- Plot calibration per skill and fix any skill whose error is high | Tracer artifact, comparison table and a leak demonstration | AUC lift and calibration: Tracer AUC at least 0.01 above PFA and at least 0.60, ECE at most 0.03, still below the oracle (starter: 0.650, 0.0063 and 0.725) (python baseline.py; pytest -k 'beats_the_pfa or student_id_encoding') |   |   |   |
| M5 | Online update and mastery API | 6-8 | - Keep LearnerState per learner in the cache; on each answer read features, predict, then apply the update, under 30 ms<br>- Expose mastery per skill as a calibrated probability and a decayed value after a break<br>- Version the skill map so a curriculum change migrates state instead of corrupting it | Service, load-test report, skill-map migration job and runbook | Latency and consistency: p99 under 30 ms per answer at 1.5 times provisioned peak, and online features equal the training replay on a shadow log (Load test and replay comparison) |   |   |   |
| M6 | Validate with learners and teachers | 4-6 | - Run an A/B test on learning gain per hour and practice efficiency using mastery-driven practice selection<br>- Review a sample of learners with teachers: do the mastery estimates match what they observe<br>- Monitor calibration per skill weekly and alert when it drifts after a curriculum change | Experiment readout, teacher review notes and monitoring | Learning outcomes: Learning gain per hour up with no drop in completion, and per-skill calibration error within the M0 target (Experiment platform and weekly calibration dashboard) |   |   |   |

## Decisions to take

**Which tracing model family?**

| Option | Choose When |
|---|---|
| Bayesian Knowledge Tracing or PFA | You need mastery per skill that teachers and regulators can read; start here and keep it as the explanation layer |
| Gradient-boosted tracer on state features | You want better prediction with a small online model and calibrated outputs; it is the practical middle step |
| Attention-based tracing (SAKT or AKT) | You have hundreds of millions of answers, need to model long interaction dependencies and can distil the model for CPU serving |

*Default:* PFA or BKT as the explainable baseline, the gradient-boosted tracer for prediction, attention models only after the headroom is measured

*Decision and date:* ____________

**How is question difficulty obtained?**

| Option | Choose When |
|---|---|
| Smoothed correct rate from training students | You have many answers per question; simple and robust |
| Fitted IRT difficulty | Questions are answered by different mixes of students and you need ability-adjusted difficulty |

*Default:* Smoothed rate on training students, IRT when the mix of students per question is uneven

*Decision and date:* ____________

**How do you handle practice chosen by the model itself?**

| Option | Choose When |
|---|---|
| Accept it and evaluate on next-answer prediction only | The goal is prediction on the same policy you deploy |
| Add randomised practice for a small share of items | You need unbiased estimates of skill difficulty or want to test a new practice policy |

*Default:* Keep a small randomised practice slice so offline conclusions are not self-fulfilling

*Decision and date:* ____________

## Pitfalls, by milestone

| At | Mistake | Symptom | Fix |
|---|---|---|---|
| M1 | Splitting rows at random | AUC looks great offline and the model disappoints on new students | Split by student and keep the disjoint-students test in CI |
| M2 | Ordering by insertion rather than timestamp | Features describe the future of a learner whose rows arrived late | Sort by server timestamp during replay and test with shuffled rows |
| M2 | Computing question difficulty on all students including the one being scored | Held-out AUC is inflated because the learner's own answers define the difficulty | Compute difficulty from training students only |
| M3 | Showing raw accuracy as mastery | In the starter the running accuracy has calibration error 0.114, so a displayed 90% is really far lower | Calibrate and report calibration error per skill |
| M4 | Adding a student-id encoding | AUC 0.671 on a random split and 0.587 on held-out students, below the baseline | Evaluate on held-out students and drop features that cannot exist for a new learner |
| M5 | Computing features differently online and in training | Live predictions are systematically off and nobody can say why | Reuse LearnerState in both paths and run a replay comparison in CI |
| M6 | Ignoring long breaks | A learner returns after weeks and is assigned work far above their level | Decay mastery with time since practice and use a short diagnostic after a long gap |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Determinism and plausibility | pytest test_generator_is_deterministic_and_correctness_is_plausible | Same seed gives the same log and overall correctness between 40% and 85% |   |
| Read before update | pytest test_state_is_read_before_the_answer_is_applied | The first read of a skill shows zero history and the second shows exactly one right answer and the right time gap |   |
| Order invariance | pytest test_features_depend_on_timestamps_not_on_row_order | Shuffling input rows changes no feature, because replay sorts by timestamp |   |
| Student split | pytest test_train_and_test_students_are_disjoint | No student id appears in both sets and together they cover everyone |   |
| Tracer beats baseline and is calibrated | pytest test_tracer_beats_the_pfa_baseline_and_is_calibrated | Tracer AUC at least 0.01 above PFA and at least 0.60, calibration error at most 0.03, below the oracle |   |
| Raw accuracy is not mastery | pytest test_a_raw_running_accuracy_is_not_a_calibrated_mastery_estimate | Running accuracy has calibration error above 0.08 and PFA beats it by at least 0.03 AUC |   |
| Student-id leak | pytest test_student_id_encoding_wins_on_random_splits_and_fails_on_new_students | The encoding gains at least 0.05 AUC on a random split relative to a student split and falls below PFA on new students |   |
| Online and replay parity | Replay 10,000 logged answers through the service and through features.replay | Identical features and predictions within floating-point tolerance |   |
| Load test at 1.5× provisioned peak | k6 or Locust replaying production-shaped traffic | p99 stays under 80 ms at 7.8K req/s with zero errors outside the degradation ladder |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on AUC and RMSE on next-response prediction (student-split).
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "New curriculum remaps skills".
- [ ] Week 3 — 1% canary with an automatic rollback on "Practice efficiency"; read "Learning gain per hour" against a held-out control group.
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
