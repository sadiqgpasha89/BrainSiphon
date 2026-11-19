# Session-Based Next-Item Recommendation: delivery plan

> Generated from the blueprint `retail/session-based-next-item-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Session-Based Next-Item Recommendation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 22–31 engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.

**Skills the team needs**

- Sparse matrices and counting in NumPy and SciPy, and how item-to-item co-occurrence works
- Ranking metrics for next-item prediction: hit rate at k, MRR and coverage, and leave-last-out evaluation
- Why random splits leak in recommender data and how to split by time
- Basic bot detection from behavioural signals such as dwell time and traversal order

**Tools**

- Python 3.11+ with numpy, pandas, scipy (requirements.txt in the starter)
- A clickstream (Kafka or similar) and a key-value store for session state (Redis) for M5
- An ANN index (HNSW via FAISS or similar) once you move to embeddings

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Define the slot, the metric and the constraints | 1-2 | - Name the placement (product page, cart, home) and what a good recommendation is there: a click, an add-to-cart or a purchase<br>- Choose offline metrics (MRR at 20, hit rate at 20, coverage) and the online metric they must predict<br>- Fix the constraints: anonymous users, no cross-site tracking, 50 ms end to end, items must be in stock | One-page spec for the slot, the metrics and the constraints | Slot and metric agreement: A named online metric and the offline metric expected to track it, signed by the owning product manager (Review before any modelling) |   |   |   |
| M1 | Sessions, time split and leave-last-out | 3-4 | - Build ordered sessions from the clickstream and run python make_data.py or load a public set<br>- Split by time: train on days before 21, skip a gap day, test from day 24, and verify no session sits on both sides<br>- Define leave-last-out evaluation and never recommend items already in the prefix | Session table and a written split and evaluation protocol | Generator, split and protocol tests: pytest -k 'deterministic or time_split or never_credits' passes (Run pytest in the starter directory) |   |   |   |
| M2 | Bot filter and session features | 3-4 | - Filter sessions whose median dwell is under a second and report precision and recall against any known bots<br>- Build ordered transition counts and a symmetric co-visitation matrix from the filtered sessions only<br>- Derive a session theme feature from the prefix and nothing else | Bot filter, count matrices and feature code with tests | Bot filter quality: At least 95% of crawler sessions removed and at least 98% of human sessions kept (pytest -k bot_filter) |   |   |   |
| M3 | Baselines: popularity, co-visitation, ordered transitions | 2-3 | - Report popularity, bag-of-items co-visitation and ordered transition counts on the test sessions<br>- Measure how much click order is worth by comparing the last two<br>- Record coverage so a popularity machine cannot pass as a good model | Baseline table with HitRate@20, MRR@20 and coverage | Order and personalisation over popularity: Ordered transitions beat bag co-visitation on MRR by at least 0.04, and co-visitation reaches at least five times popularity's hit rate (starter: 0.315 against 0.224 MRR, and 0.557 against 0.076 hit rate) (python baseline.py; pytest -k order_matters) |   |   |   |
| M4 | Session-aware challenger | 4-6 | - Add the session theme boost and popularity correction on top of the ordered transitions<br>- Compare with and without bots in training, and with a random versus a time split, to see the two biggest traps in numbers<br>- Decide whether a sequence model such as SASRec is justified by the remaining error before building one | Challenger scores, trap measurements and a written decision on a sequence model | No regression and a measured trap cost: Challenger HitRate@20 and MRR@20 within 0.005 of the ordered model or better, coverage above 50%, and bots in training cutting MRR by more than 10% (starter: 0.597 and 0.327, and a 16% MRR loss) (python baseline.py; pytest -k 'theme_aware or bots_in_training') |   |   |   |
| M5 | Serving: session state, retrieval and re-ranking | 6-8 | - Keep the session prefix in Redis keyed by session id with a short expiry and update it per click<br>- Retrieve candidates from precomputed transition lists or an ANN index and re-rank with stock, margin and merchandising rules<br>- Cache responses for a few seconds per prefix and degrade to category popularity when state is unavailable | Recommendation service, load-test report and runbook | Latency and freshness: p99 under 50 ms end to end at 1.5 times provisioned peak, with candidate freshness within the sale-event tolerance (Load test and a simulated sale that changes popularity mid-test) |   |   |   |
| M6 | Online test and monitoring | 3-4 | - Run an A/B test on click-through and add-to-cart with interleaving for fast read-outs on ranking changes<br>- Monitor coverage, bot share, and the gap between offline MRR and online click-through weekly<br>- Re-run the bot filter and rebuild counts daily, and review top recommendations by hand every week | Experiment readout and monitoring dashboards | Online lift: Add-to-cart rate up with no drop in revenue per visit, and coverage not collapsing toward the head of the catalogue (Experiment platform and weekly review) |   |   |   |

## Decisions to take

**Counts and nearest neighbours, or a neural sequence model?**

| Option | Choose When |
|---|---|
| Ordered item-to-item transition counts (optionally with a session theme) | You are launching, need sub-50 ms latency on CPU and an easily explained model; it is a strong baseline that is hard to beat by much |
| Session-based kNN | Sessions repeat in structure and you want a stronger non-parametric baseline before neural models |
| Transformer sequence model (SASRec-style) | Counts plateau, you have tens of millions of sessions and can afford GPU training and an embedding index |

*Default:* Ordered transitions with a theme boost; build a sequence model only when error analysis shows order beyond the last two clicks matters

*Decision and date:* ____________

**How do you evaluate negatives?**

| Option | Choose When |
|---|---|
| Rank against the full catalogue | Always for the final numbers; it is what production does |
| Sampled negatives for training speed | Training large models; use popularity-corrected sampling and never report metrics from uniform negatives, they inflate results |

*Default:* Full-catalogue metrics, sampled negatives only inside training

*Decision and date:* ____________

**Where do you filter bots?**

| Option | Choose When |
|---|---|
| At ingestion, before counts are updated | Always as the first line; keep the raw stream for analysis |
| In the model as a feature | Only as a second line when borderline traffic matters; it does not replace ingestion filtering |

*Default:* Filter at ingestion on dwell and traversal patterns and report the filtered share daily

*Decision and date:* ____________

## Pitfalls, by milestone

| At | Mistake | Symptom | Fix |
|---|---|---|---|
| M1 | Splitting sessions at random | Popularity hit rate is 26% higher on a random split than on a time split in the starter, and every model looks better offline than live | Split by time with a gap day and keep a sale or launch inside the test window |
| M1 | Letting the target item appear in the input prefix | A model that just echoes the last item scores well | Mask items already in the prefix and keep the echo test |
| M2 | Counting every click as a human signal | A crawler transition outranks real shopper behaviour and MRR falls by 16% | Filter by dwell and traversal order before counting, and monitor the removed share |
| M3 | Treating the session as a bag of items | Recommendations suggest the phone to someone who just looked at the case, with MRR 0.224 against 0.315 | Use ordered transitions and test for asymmetry |
| M4 | Choosing a transformer before measuring the gap | Months of work for a model that moves hit rate by a point | Quantify the headroom with the cheap challenger first and let error analysis justify the next step |
| M5 | Letting candidate lists go stale during a sale | Recommendations point at last week's popular items while traffic shifts within minutes | Refresh popularity features and candidate sets near real time and test with a simulated sale |
| M6 | Optimising offline MRR alone | Coverage collapses onto head items and add-to-cart stalls | Track coverage and an exploration share beside MRR, and confirm with an A/B test |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Time split | pytest test_time_split_has_a_gap_and_no_shared_session | Training ends before the test window starts and no session id appears on both sides |   |
| Bot filter quality | pytest test_bot_filter_catches_crawlers_and_keeps_humans | At least 95% of crawler sessions removed and at least 98% of human sessions kept |   |
| Evaluation protocol | pytest test_evaluation_never_credits_a_repeat_of_what_the_user_just_saw | A recommender that echoes the last item scores a hit rate of 0 |   |
| Order and personalisation | pytest test_order_matters_and_everything_beats_popularity | Ordered MRR exceeds bag MRR by 0.04 and co-visitation reaches at least five times popularity's hit rate |   |
| Challenger does not regress | pytest test_theme_aware_challenger_does_not_regress | Hit rate and MRR within 0.005 of the ordered model or better, with coverage above 50% |   |
| Bots hurt ranking quality | pytest test_leaving_bots_in_training_hurts_ranking_quality | MRR with bots left in training is below 90% of MRR with the filter |   |
| Random splits flatter the baseline | pytest test_random_session_splits_flatter_the_popularity_baseline | Popularity hit rate on a random split exceeds the time-split figure by more than 10% |   |
| Stock and freshness at serving | Integration test that marks the top candidate out of stock during a simulated sale | The service drops it and backfills within one request, and popularity features refresh inside the sale tolerance |   |
| Load test at 1.5× provisioned peak | k6 or Locust replaying production-shaped traffic | p99 stays under 80 ms at 3.8K req/s with zero errors outside the degradation ladder |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on HitRate@20 and MRR on time-split.
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "Bot traffic produces random sequences".
- [ ] Week 3 — 1% canary with an automatic rollback on "Add-to-cart rate"; read "Click-through on recommendations" against a held-out control group.
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
