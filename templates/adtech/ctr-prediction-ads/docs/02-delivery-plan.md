# Ad Click-Through Rate Prediction: delivery plan

> Generated from the blueprint `adtech/ctr-prediction-ads` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Click-Through Rate Prediction · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 23–31 engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.

**Skills the team needs**

- Logistic regression and gradient boosting on sparse categorical data, including feature hashing and crosses
- Probability calibration: reliability tables, isotonic regression and expected calibration error
- Ad-auction basics: expected value is bid times predicted click probability, so a miscalibrated score misprices the auction
- Causal thinking about logged data: position bias, selection by the old ranker, and why a small randomised slice matters

**Tools**

- Python 3.11+ with numpy, pandas, scikit-learn (requirements.txt in the starter)
- A stream or log store for impressions (Kafka plus a warehouse) and a model server that can load ONNX or similar for M5
- An experimentation platform able to split traffic for M6

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Fix the objective, the calibration target and the latency budget | 1-2 | - Write down how the auction uses the score (expected revenue is bid times predicted CTR) so everyone agrees calibration is a requirement, not a nicety<br>- Agree the evaluation metrics: normalised cross-entropy, calibration error per placement and bias by display position<br>- Set the serving budget (about 2 ms for inference inside an 8 ms request) and the data-freshness target | One-page spec: auction use of the score, metrics, budgets and the traffic share reserved for randomisation | Spec exists: Signed by ads-product and ranking leads, with a number for NE, per-placement calibration error and p99 latency (Design review) |   |   |   |
| M1 | Impression log, labels and chronological split | 3-4 | - Make sure each impression is logged with its display position, placement, device, dwell time and an exploration flag<br>- Split by time into 70% train, 15% validation and 15% test and never shuffle across the boundary<br>- Define the label rules: clicks under 500 ms dwell become 0, and note how many that removes | Reproducible impression table and split definition | Generator and split tests: pytest -k 'deterministic or chronological' passes; CTR between 2% and 9% (Run pytest in the starter directory) |   |   |   |
| M2 | Hashed crosses and point-in-time history | 4-5 | - Hash ids and crosses (ad by placement, segment by category, advertiser by device) into a fixed-size sparse vector<br>- Compute smoothed CTR by ad, ad and placement, and advertiser from impressions strictly before the scored one<br>- Add ad age and log impression count so the model knows how much history to trust | features.py with a future-truncation test for history features | History leakage test: Deleting impressions after the 60th percentile of time changes no history feature of earlier rows (pytest -k history_uses_only) |   |   |   |
| M3 | Position-aware baseline | 2-3 | - Train a hashed logistic regression with position as a feature and serve it with position set to the top slot<br>- Also train it without position, to measure how wrong the naive model is by slot<br>- Report NE, calibration error and predicted-over-true click rate at positions 1 and 5 | Baseline model and a bias-by-position table | NE and position bias: NE below 0.95 and predicted over true CTR between 0.9 and 1.1 at positions 1 and 5 (starter: NE 0.911, 0.97 and 1.03; the no-position model shows 0.75 and 1.79) (python baseline.py, then pytest -k ignoring_position) |   |   |   |
| M4 | Challenger plus per-placement calibration | 4-5 | - Train a gradient-boosted model on the dense history features and fit isotonic regression per placement on the validation slice<br>- Compare on NE, calibration error, cold-start ads and bias by position, with an interval from resampling users<br>- If the challenger does not win on NE, ask whether its calibration or cold-start behaviour justify the extra complexity | Challenger artifact, calibration layer and a comparison report | NE and calibration versus baseline: Challenger NE no worse than baseline by more than 0.005 and expected calibration error lower than the baseline's (starter: NE 0.911 against 0.911, ECE 0.0040 against 0.0077) (python baseline.py; pytest -k challenger_earns) |   |   |   |
| M5 | Serving path under a 2 ms budget | 6-8 | - Hash features in-process, look up sharded embedding tables with a bounded timeout and score with a quantised model on CPU<br>- Make embedding and model swaps atomic and versioned so no request sees a half-updated table<br>- Degrade in steps: stale history, then the baseline model, then a static prior per placement | Scoring service, load-test report and swap runbook | Latency and version safety: p99 inference at most 2 ms at 1.5 times provisioned peak, and a table swap under load produces no score discontinuity beyond the agreed tolerance (Load test plus a canary swap during the test) |   |   |   |
| M6 | Randomised slice, online test and monitoring | 3-4 | - Keep a 2-5% randomised-position slice as the permanent unbiased evaluation set<br>- Run an A/B test on revenue per thousand impressions with advertiser CTR satisfaction as a guardrail<br>- Alert hourly when expected clicks and observed clicks diverge for any placement | Experiment readout, monitoring dashboards and a retraining cadence | Revenue and calibration online: Revenue per thousand impressions up with advertiser CTR satisfaction not down, and live expected-over-observed clicks within 5% for every placement (Experiment platform and the hourly calibration dashboard) |   |   |   |

## Decisions to take

**Linear model with crosses, or a deep model such as DCN-v2 or DeepFM?**

| Option | Choose When |
|---|---|
| Hashed logistic regression with hand-picked crosses | You are launching, latency is tight and you need a baseline whose behaviour you can explain; it is the right first release |
| Deep cross network with learned embeddings | The baseline plateaus on NE, you have billions of impressions and many high-cardinality ids, and you can afford embedding-table serving and the extra monitoring |

*Default:* Ship the position-aware linear model first; only move to deep models when a held-out NE gain survives several seeds

*Decision and date:* ____________

**How do you correct position bias?**

| Option | Choose When |
|---|---|
| Position as a training feature, set to the top slot at serving | You have a reasonable amount of position variation in the logs; simplest and works well |
| Inverse-propensity weights from a randomised slice | Position is nearly deterministic in your logs, so the model cannot separate it from quality |

*Default:* Position as a feature, with a 2-5% randomised slice to check the result and to calibrate

*Decision and date:* ____________

**Do you downsample negatives to train faster?**

| Option | Choose When |
|---|---|
| No, train on all impressions or a random sample with known weights | You can afford it; calibration stays correct automatically |
| Yes, then correct the probabilities back | Data volume forces it; apply the standard correction p / (p + (1 - p) / w) with w the sampling rate, and recheck calibration by placement |

*Default:* Sample with explicit weights and verify calibration on an unsampled validation slice

*Decision and date:* ____________

## Pitfalls, by milestone

| At | Mistake | Symptom | Fix |
|---|---|---|---|
| M1 | Shuffling impressions across time before splitting | Offline NE is better than any live experiment will ever show, especially for new ads | Split chronologically and keep cold-start ads in the test window |
| M1 | Counting accidental taps as clicks | Mobile banners look better than they are and misleading creatives win auctions | Drop clicks with very short dwell time from labels and history, and report how many were removed |
| M2 | Computing an ad's CTR over its whole history including the scored impression | Offline AUC jumps while live CTR does not; the feature memorises the label | Use only impressions strictly before the scored one and keep the truncation test in CI |
| M3 | Ignoring display position because overall calibration looks fine | In the starter, predictions are 25% low at the top slot and 79% high at the bottom slot while overall ECE is 0.0075 | Train with position, serve at the top slot, and always report bias by slot |
| M4 | Promoting a deep model for a gain inside the noise | The challenger ties NE, costs ten times more to serve and adds a new failure mode | Require a gain that survives several seeds and an interval from resampling users, or a clear calibration or cold-start benefit |
| M5 | Swapping embedding tables in place | A fraction of requests are scored with half-old, half-new embeddings and CTR jumps for minutes | Version tables and models together and switch atomically behind a canary |
| M6 | Never exploring | New creatives get no impressions, so their CTR is never learned and revenue stagnates | Keep an exploration budget and content-based priors, and track new-ad exposure as a metric |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Chronological split | pytest test_time_split_is_chronological | Train ends before validation starts and validation ends before test starts |   |
| History future-truncation test | pytest test_history_uses_only_impressions_before_the_row | Smoothed CTR and impression counts of earlier rows are identical with and without later rows |   |
| Smoothing and mis-tap arithmetic | pytest test_smoothed_history_excludes_the_current_click_and_mis_taps | The first impression equals the prior, later values follow (clicks + prior) / (impressions + 60), and a 100 ms click never enters history |   |
| Normalised cross-entropy definition | pytest test_ne_of_the_base_rate_predictor_is_one | A predictor that always outputs the base rate scores exactly 1.0 |   |
| Position bias demonstration and fix | pytest test_ignoring_position_biases_every_slot_and_position_awareness_fixes_it | No-position model over-predicts position 5 by more than 40% and under-predicts position 1 by more than 15%; the position-aware model is within 10% at both |   |
| Model gate | pytest test_baseline_beats_the_base_rate_and_challenger_earns_its_place | Baseline NE below 0.95; challenger NE within 0.005 of baseline and ECE no higher |   |
| Train and serve hashing parity | Replay 1,000 logged impressions through the serving hasher and hashed_matrix | Identical non-zero indices and values for every impression |   |
| Live calibration monitor | Hourly expected versus observed clicks per placement on production traffic | Within 5% for every placement with at least 10,000 impressions in the hour; otherwise page |   |
| Load test at 1.5× provisioned peak | k6 or Locust replaying production-shaped traffic | p99 stays under 8 ms at 16.7K req/s with zero errors outside the degradation ladder |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on AUC, log-loss and normalised cross-entropy.
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "Embedding table updates mid-serving cause version skew".
- [ ] Week 3 — 1% canary with an automatic rollback on "Advertiser CTR satisfaction"; read "Revenue per mille" against a held-out control group.
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
