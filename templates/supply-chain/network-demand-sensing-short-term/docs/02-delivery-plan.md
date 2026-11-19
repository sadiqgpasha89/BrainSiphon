# Short-Term Demand Sensing: delivery plan

> Generated from the blueprint `supply-chain/network-demand-sensing-short-term` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Short-Term Demand Sensing · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 25–33 engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.

**Skills the team needs**

- Time-series validation by forecast origin: rolling-origin splits and why a random split leaks
- Quantile regression and checking that a P90 band really covers 90% of outcomes
- Forecast accuracy metrics (WMAPE, bias, forecast value added) and why aggregate accuracy flatters you
- Supply-chain vocabulary: open order book, allocation, stock-out censoring, planning hierarchy and planner overrides

**Tools**

- Python 3.11+ with numpy, pandas, scikit-learn (requirements.txt in the starter)
- POS and order feeds into a warehouse; a scheduler such as Airflow for the nightly run in M5
- A planning system with an API or table for publishing forecasts (M5)

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Agree horizons, hierarchy and what accuracy is for | 2-3 | - Decide which decisions consume the forecast (expedite, reallocate, replenish) and therefore which horizons and levels matter<br>- Pick the metric that planners already trust, usually weighted MAPE at SKU-location level, and the forecast-value-added target against today's statistical forecast<br>- Agree the planning hierarchy and how forecasts must add up, and how planner overrides will be recorded | Spec naming horizons, level of evaluation, hierarchy rule and the FVA target | Evaluation contract: A written metric, level and baseline signed by the demand-planning lead before modelling (Review with planning and supply) |   |   |   |
| M1 | Data, origins and rolling split | 3-4 | - Build a table with one row per series, forecast origin and horizon; run python make_data.py or load a public set<br>- Split by origin so every training target day lies before the first validation origin<br>- Flag allocation-limited days and decide how they are excluded from training and scoring | Origin-based dataset and split definition | Generator and split tests: pytest -k 'deterministic or precede' passes; the order book correlates above 0.5 with next-day demand (Run pytest in the starter directory) |   |   |   |
| M2 | Origin-safe sensing features | 4-5 | - Compute recent means, 7-over-28 momentum and same-weekday history using only days up to the origin<br>- Add the open order book snapshot, planned promotion flag and external signal for the target day<br>- Handle a late feed: leave missing days missing and count them, never read them as zero | features.py with tests for the future and for late feeds | Origin and late-feed tests: Corrupting every sales value after the origin changes no feature; a late day is missing_7 = 1 and lowers nothing (pytest -k 'ignore_everything or late_pos') |   |   |   |
| M3 | Seasonal baseline and the number to beat | 2-3 | - Forecast each day as the mean of the last same weekdays before the origin<br>- Report WMAPE at horizons 1, 3, 7 and 14 on the test origins, at SKU level and in aggregate<br>- Write the baseline numbers down; every later claim is forecast value added against them | Baseline report at SKU level | Baseline WMAPE: Recorded per horizon (starter: 0.20-0.22) with both SKU-level and aggregate views (python baseline.py) |   |   |   |
| M4 | Quantile gradient boosting with calibrated bands | 4-5 | - Train a median model and a 90th-percentile model on scaled targets, excluding constrained days<br>- Check that the P90 covers about 90% of outcomes and that FVA holds at every horizon<br>- Show the aggregate-versus-SKU gap to planners so nobody is misled by a headline number | P50 and P90 models, FVA table and coverage check | Forecast value added and coverage: FVA of at least 0.25 at every horizon and P90 coverage between 85% and 95% (starter: FVA 0.36-0.43, coverage 89%) (python baseline.py; pytest -k adds_value) |   |   |   |
| M5 | Nightly pipeline and reconciliation | 7-9 | - Schedule the nightly job so it waits for feed-completeness checks per partner and flags incomplete feeds instead of imputing zeros<br>- Reconcile SKU forecasts to the planning hierarchy (top-down, bottom-up or MinT) and publish P50, P90 and a confidence flag<br>- Record every planner override with the forecast it replaced so its value can be measured | Nightly pipeline, reconciliation step, publication contract and runbook | Run time and consistency: Nightly refresh finishes inside the agreed window at the full series count, and reconciled forecasts add up to the plan at every level within rounding (Full-scale dry run plus an automated hierarchy-sum check) |   |   |   |
| M6 | Shadow period and planner adoption | 3-4 | - Publish forecasts beside the current forecast for four weeks without changing any order<br>- Track forecast accuracy at lag 2 and the value of planner overrides (did they add or remove accuracy)<br>- Switch on for one category, measuring expedites avoided and stock-outs, then widen | Shadow report and a category-by-category rollout plan | Accuracy and decisions: Lag-2 WMAPE better than the incumbent for the pilot category by the M0 target, and no rise in stock-outs (KPI dashboard comparing incumbent and new forecasts on actuals) |   |   |   |

## Decisions to take

**One global model or a model per series?**

| Option | Choose When |
|---|---|
| One global model on scaled targets | You have thousands of series with short histories; it shares strength across SKUs and is cheap to retrain nightly |
| Per-series statistical models (ETS or similar) | You have few, long, stable series and need to explain every forecast term by term |

*Default:* Global boosted model against a per-series seasonal baseline

*Decision and date:* ____________

**How do you make forecasts add up to the plan?**

| Option | Choose When |
|---|---|
| Bottom-up from SKU forecasts | SKU-level accuracy is good and the plan can be regenerated from it |
| Top-down proportional split of an aggregate forecast | The aggregate forecast is far more accurate and SKU shares are stable |
| Optimal reconciliation (MinT) | You have a deep hierarchy and can estimate forecast-error covariances; it usually improves every level |

*Default:* Bottom-up first, then MinT once the hierarchy and error estimates are stable

*Decision and date:* ____________

**How do you treat planner overrides?**

| Option | Choose When |
|---|---|
| Record every override and score it against actuals | Always; it shows which overrides add accuracy and builds trust |
| Block overrides | Never as a starting point; planners know about deals and disruptions the model has not seen |

*Default:* Allow, record and report override value monthly

*Decision and date:* ____________

## Pitfalls, by milestone

| At | Mistake | Symptom | Fix |
|---|---|---|---|
| M1 | Splitting rows at random | Excellent offline error that disappears live, because training rows share origins with test rows | Split by forecast origin and keep every training target before the first validation origin |
| M2 | Using signals that arrive after the forecast time | Accuracy jumps by half and the live model cannot reproduce it | Build features from an origin snapshot and corrupt the future in a test to prove it |
| M2 | Reading a late POS feed as zero demand | In the starter, WMAPE rises from 0.14 to 0.20 on the days a feed is late and orders are cut for no reason | Leave missing days missing, flag them and alert on feed completeness |
| M2 | Training on allocation-capped sales | The model under-forecasts after supply restrictions end because it learned that demand had fallen | Flag constrained days and exclude them from training and scoring, or model them as censored |
| M3 | Judging the model against nothing | A WMAPE of 0.12 sounds good until the seasonal baseline turns out to be 0.20 on the same data | Always report forecast value added against the incumbent baseline |
| M4 | Reporting aggregate accuracy | In the starter the network total is wrong by 2.6% while individual SKUs are wrong by 12.3%, and planners distrust the numbers | Report at the level decisions are made, with the aggregate as a secondary view |
| M5 | Publishing only a point forecast | Planners cannot tell a confident forecast from a guess and override the good ones | Publish P50 and P90 with a confidence flag and track override value |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Origin safety | pytest test_features_ignore_everything_after_the_origin | Setting every sales value after the origin to 1,000,000 changes no feature |   |
| Late feed handling | pytest test_a_late_pos_day_is_missing_not_zero | A missing latest day is counted in missing_7 and does not pull the 7-day mean down |   |
| Split order | pytest test_training_targets_precede_validation_origins | The last training target day is before the first validation origin |   |
| Metric definition | pytest test_wmape_definition | Weighted MAPE of [10, 10] against [8, 12] equals 0.2 |   |
| Forecast value added and band coverage | pytest test_model_adds_value_over_the_seasonal_baseline_at_every_horizon | FVA at least 0.25 at horizons 1, 3, 7 and 14, and P90 coverage between 85% and 95% |   |
| Aggregate versus SKU error | pytest test_aggregate_accuracy_hides_sku_level_error | Aggregate WMAPE is below half the SKU-level WMAPE, proving the headline number is not the one to ship on |   |
| Late feed experiment | pytest test_zero_filling_a_late_feed_hurts_more_than_leaving_it_missing | WMAPE with the day left missing is below 85% of WMAPE with the day zero-filled |   |
| Hierarchy consistency | Automated sum check of reconciled forecasts against plan totals at every level | Differences within rounding for every node on every run |   |
| Load test at 1.5× provisioned peak | Synthetic backfill at 1.5× daily volume | Run finishes inside the 2 h window at 1.5× data volume with no failed partitions |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on Weighted MAPE at 1-14 day horizons.
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "POS feed arrives late for a region".
- [ ] Week 3 — 1% canary with an automatic rollback on "Expedite shipments avoided"; read "Forecast accuracy at lag 2" against a held-out control group.
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
