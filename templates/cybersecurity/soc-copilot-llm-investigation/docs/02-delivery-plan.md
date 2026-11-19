# SOC Investigation Copilot: delivery plan

> Generated from the blueprint `cybersecurity/soc-copilot-llm-investigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SOC Investigation Copilot · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

Two views of the same work: the build milestones for this use case (M0 to M6, each with a numeric exit gate) and the seven delivery phases every use case passes through.

## Effort and prerequisites

**Effort.** 32–43 engineer-days from empty repo to a shadow-ready system; platform, security review and approvals are extra lead time.

**Skills the team needs**

- Security operations basics: alert triage, SIEM and EDR logs, indicators of compromise and what makes an alert benign
- LLM tool-calling and agent loops, and why tool output is untrusted input (prompt injection)
- Evaluation design for agents: held-out replay cases, planted adversarial cases and separating tuning from reporting
- Least-privilege design: typed tool schemas, allow-lists, approval gates and audit logging

**Tools**

- Python 3.11+ with pytest (the starter has no other dependencies)
- Read-only access to a SIEM and an EDR API, an identity provider and threat-intelligence lookups for M2 and M5
- An LLM with tool calling and an immutable audit log store

## Build milestones and exit gates

| Id | Milestone | Days | Tasks | Deliverable | Exit gate | Owner | Planned | Done |
|---|---|---|---|---|---|---|---|---|
| M0 | Decide what the agent may do and who decides | 2-3 | - List the actions: read-only evidence gathering by default; containment (isolating a host, disabling an account) only with named analyst approval<br>- Define the output: a verdict with cited log lines, or an escalation with the reason; never a narrative without evidence<br>- Set targets: evidence validity, verdict accuracy on auto-decided cases, injection success rate (zero), and a ceiling on escalation rate | Authority matrix, output contract and numeric targets | Authority and targets: Signed by the SOC lead and security architecture; containment is never allowed without approval, and the injection success target is zero (Security design review) |   |   |   |
| M1 | Replay set with held-out and planted cases | 4-6 | - Assemble closed cases with the analyst's verdict and the log lines they relied on; run python make_data.py for the synthetic version<br>- Split into a tuning half and a test half and freeze the test half<br>- Add planted-instruction cases built from real log fields, file names and ticket text, and cases where a backend is unavailable | Replay set, split manifest and an attack catalogue | Set composition: pytest -k 'deterministic or disjoint' passes: 5-20% planted cases, 2-15% outage cases and no case in both halves (Run pytest in the starter directory) |   |   |   |
| M2 | Typed tools, allow-list and approval gate | 5-6 | - Wrap each backend as a typed tool with a narrow schema (host, user, ip and a time window) and no free-form shell or query language<br>- Allow only read-only tools to the agent; make containment a separate tool that fails without an analyst approval token<br>- Write every call, result and failure to an immutable audit log with the case id | Tool layer with allow-list, approval gate and audit trail | Permission tests: A write tool is rejected when it is not on the allow-list and when it is on the list but unapproved (pytest -k write_tools_are_blocked) |   |   |   |
| M3 | Baseline: the careless agent | 2-3 | - Run an agent that treats tool output as instructions and guesses when evidence is missing, to measure the risk honestly<br>- Record verdict accuracy, injection success, unsafe actions and how many outage cases it decided without evidence<br>- Keep the numbers in the repository so every later claim is a delta against them | Baseline risk report | The risk is real and measured: Injection success at least 40% with at least 3 unsafe actions, and every outage case decided without evidence (starter: 61.5%, 7 unsafe actions, 5 of 5) (python baseline.py; pytest -k naive_agent_obeys) |   |   |   |
| M4 | Guarded agent with a verifier | 5-7 | - Treat every log field and tool result as untrusted data: redact instruction-like text, never pass it to the planner as instructions, and flag the case<br>- Verify each claim against the cited log line before accepting a verdict, and escalate when evidence is missing or a tool fails<br>- Re-run the same replay set and report the guarded numbers beside the baseline | Guarded agent, verifier and a before-and-after report | Safety and quality: Injection success 0%, unsafe actions 0, every decided case backed by valid evidence, accuracy on auto-decided cases at least 95%, outage cases escalated (starter: 0%, 0, 100%, 100% and 5 escalations) (python baseline.py; pytest -k 'guarded') |   |   |   |
| M5 | Put the real model behind the harness | 8-10 | - Replace the scripted planner with your LLM through the same interface and the same typed tools; keep the verifier and the allow-list unchanged<br>- Re-run the whole replay set, plus a larger set of paraphrased injections that evade keyword filters, and compare with the scripted numbers<br>- Set step and cost budgets, and make the agent stop and escalate when it runs out | LLM-backed agent that passes every gate, with budgets and a cost report | Same gates with a real model: Zero unsafe actions and zero successful injections on the replay set, evidence validity at the M0 target, and p95 investigation time inside the interactive budget (Replay harness with the LLM, plus the paraphrase attack set) |   |   |   |
| M6 | Shadow mode, then analyst assist | 6-8 | - Run in shadow for several weeks: the agent investigates every alert, analysts decide as usual, and agreement is measured blind<br>- Enable assist for low-risk alert types first, showing the cited evidence beside the proposed verdict<br>- Review every escalation reason and every disagreement weekly, and add them to the replay set | Shadow report, assisted rollout plan and weekly review process | Agreement and trust: Blind agreement with senior analysts at or above the M0 target, escalation precision acceptable to analysts, and investigation time per alert down with no missed true positives in a sampled audit (Blind review and a sampled audit of auto-closed cases) |   |   |   |

## Decisions to take

**How much autonomy does the agent get?**

| Option | Choose When |
|---|---|
| Propose only (verdict and evidence, analyst acts) | You are starting out or the alert type has costly false positives; the right default |
| Auto-close low-risk benign alert types | A sampled audit shows no missed true positives over several weeks and the evidence is verifiable by rule |
| Auto-contain | Rarely; only for narrow, reversible actions on low-criticality assets with explicit approval policy |

*Default:* Propose only, then auto-close narrow benign classes after an audit; containment always needs approval

*Decision and date:* ____________

**How do you defend against prompt injection?**

| Option | Choose When |
|---|---|
| Structural limits: typed tools, allow-list, approval gate, untrusted-data handling | Always; these hold even when the model is fooled |
| Detection filters for instruction-like text | As an alarm that flags suspicious cases for review, never as the only defence |
| Model-level instruction hierarchy and fine-tuning | In addition, once you can measure it on your own attack set |

*Default:* Structural limits first, filters as alarms, model hardening measured on the replay set

*Decision and date:* ____________

**Which planner do you use?**

| Option | Choose When |
|---|---|
| Scripted playbook per alert type | Alert types are few and stable and you need determinism; it is also your baseline |
| LLM planner with a step budget | Investigations vary and the harness (tools, verifier, escalation) is already proven |

*Default:* Scripted playbook as the baseline, LLM planner behind the same harness once the gates pass

*Decision and date:* ____________

## Pitfalls, by milestone

| At | Mistake | Symptom | Fix |
|---|---|---|---|
| M1 | Tuning prompts on the cases you report | Every prompt change improves the score and analysts see no improvement | Freeze a test half, tune on the other half and add every production miss to the tuning half |
| M2 | Giving the agent a free-form query or shell tool | A planted instruction can read or change anything the tool can reach | Use typed tools with narrow schemas and keep write actions behind an approval token |
| M3 | Judging the agent by verdict accuracy alone | 97% accuracy while 61.5% of poisoned cases steer the agent and it takes 7 unsafe actions | Report injection success, unsafe actions and cases decided without evidence beside accuracy |
| M4 | Letting the model write a fluent narrative when evidence is missing | Two real attacks are closed as benign during a log outage | Verify every claim against the cited line and escalate when the deciding lines are unavailable |
| M4 | Relying on a keyword filter to stop injections | A reworded instruction passes the filter | Make the defence structural: allow-list, approval gate and untrusted-data handling hold without the filter |
| M5 | Swapping the model and skipping the replay set | A new model follows a planted instruction the old one ignored | Re-run the full replay, including paraphrased attacks, on every model, prompt or tool change |
| M6 | Measuring analyst satisfaction instead of correctness | Analysts like the summaries while missed attacks go unnoticed | Measure blind agreement and audit a sample of auto-closed cases for missed true positives |

## Test and acceptance plan

| Test | Tool or command | Pass criterion | Result |
|---|---|---|---|
| Replay set composition | pytest test_generator_is_deterministic_and_contains_both_traps | Same seed gives the same cases; 5-20% planted-instruction cases and 2-15% outage cases |   |
| Tuning and test halves | pytest test_dev_and_test_cases_are_disjoint_halves | No case id in both halves and together they cover every case |   |
| Write tools need an allow-list entry and an approval | pytest test_write_tools_are_blocked_without_an_allow_list_entry_and_an_approval | isolate_host fails when absent from the allow-list, fails when allowed but unapproved, and succeeds only with both |   |
| Evidence verifier | pytest test_the_verifier_rejects_claims_that_do_not_match_their_log_line | Claims citing a missing line, a routine line or nothing at all are rejected |   |
| Prompt-injection resistance | pytest test_a_naive_agent_obeys_instructions_hidden_in_logs_and_a_guarded_one_does_not | Naive injection success at least 40% with at least 3 unsafe actions; guarded exactly 0% and 0 |   |
| Honest escalation | pytest test_guarded_agent_escalates_when_evidence_is_missing_instead_of_guessing | Every outage case is decided without evidence by the naive agent and by the guarded agent in none |   |
| Accuracy and evidence validity | pytest test_guarded_verdicts_are_accurate_and_every_claim_is_backed_by_a_deciding_log_line | Accuracy on auto-decided cases at least 95%, evidence precision at least 99%, at most 6 steps per case |   |
| Paraphrased injection set | Replay with 200 reworded instructions generated from real log fields, run against the LLM-backed agent | Zero changed verdicts and zero tool calls outside the allow-list |   |
| Audit trail completeness | Compare the audit log with the tool-call trace for every replayed case | Every call, result and failure is present with the case id, in order, and cannot be edited |   |
| Load test at 1.5× provisioned peak | k6 or Locust replaying production-shaped traffic | p99 stays under 2500 ms at 31.3K req/s with zero errors outside the degradation ladder |   |
| Dependency game-day | Fault injection (kill, add 500 ms latency) per dependency | Each failure moves the service one rung down the degradation ladder; callers never see an unhandled error and the decision log records the rung |   |

## First 30 days after launch

- [ ] Week 1 — shadow only: score live traffic with the model, take no action, and compare against the baseline on Verdict accuracy on replayed cases.
- [ ] Week 2 — read the 50 largest disagreements between baseline and model by hand; write each as a test case, starting with "Attacker plants instructions in log fields or file names".
- [ ] Week 3 — 1% canary with an automatic rollback on "Escalation precision"; read "Investigation time per alert" against a held-out control group.
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
