# Unit Test Generation Agent: operations runbook

> Generated from the blueprint `devtools/unit-test-generation-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Unit Test Generation Agent · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

What the on-call engineer needs at 3 a.m.: objectives, alerts, the first steps for each known failure, how to roll back, and what each decision costs.

## Service level objectives

| Indicator | Objective | Window | Error budget |
|---|---|---|---|
| Share of valid requests answered inside the deadline | Run completes inside the 2 hour window on 99% of days | 30 days | ≈ 7 late runs per year |
| End-to-end latency | Run duration p95 within 70% of the window | 30 days, per region | Any run over the window |
| Input freshness at the consumer | All inputs landed before the run opens | Rolling 1 day | Two breaches per week before the data owner is escalated |
| Model quality on matured labels | Coverage of critical code within guardrail | Weekly, per slice | No slice below its floor for two consecutive windows |
| Decisions served from a degraded path | ≤ 1% of decisions below degradation level 1 | 30 days | 1% of decisions; a breach triggers a review of the ladder |
| Cost per 1,000 decisions | ≤ $0.045 | Monthly | 20% over the modelled cost before FinOps review |

## Telemetry to collect

| Layer | Signals |
|---|---|
| Model | Score and calibration distributions, drift (PSI/KS) per feature, slice metrics, challenger agreement |
| Data | Freshness, volume, schema and null-rate per contract, quarantine counts, late-event share |
| Infrastructure | GPU workers utilisation, queue depth, memory, replica lag, event-bus consumer lag |
| Application | Per-stage latency (Coverage gap analysis, Test drafting, Compile and run in sandbox), error rate by dependency, fallback level, decisions by action |

## Severities

| Sev | Definition | Response |
|---|---|---|
| SEV1 | Decisions are wrong, unavailable or unsafe for many repository, pull request or pipeline runs, or a regulatory obligation is at risk | Page immediately, incident commander named, 15 minute acknowledgement, executive update every 30 minutes |
| SEV2 | Degraded path in use, a guardrail is breaching or one region or tenant is affected | Page L2, 30 minute acknowledgement, fix within the working day |
| SEV3 | Drift warning, non-critical dependency failure or a single failed run with a safe fallback | Ticket to the owning team, fixed within the sprint |

## Support model

| Level | Owns |
|---|---|
| L1 | Watch dashboards, follow runbooks, restart jobs, open and route tickets |
| L2 | ML platform on-call: rollbacks, backfills, scaling, breaker and feature-store operations |
| L3 | DevTools AI model and data owners: quality diagnosis, retraining, contract changes; vendors engaged here only |

## Release and rollback

- **Deploy:** Signed image and model artifact promoted through GitOps; dry-run, shadow run, then cut-over at a run boundary.
- **Rollback:** One-step revert to the previous registry version and serving revision, with backward-compatible schema migrations only; rollback is rehearsed every quarter.

**Rollback paths**

- Automatic rollback to the previous registry version on SLO or guardrail breach during canary
- Manual one-step rollback with the previous champion kept warm and signature-verified
- Feature-pipeline rollback by flipping the versioned namespace pointer back
- If the new version corrupted decisions, replay affected inputs through the previous version and correct downstream records from the ledger

## Runbook entries

### RB-01 Model endpoint becomes unavailable

- **Detect:** Health probes and error rate on Test drafting; breaker state
- **Alert:** Page L2 when errors exceed 2% for 2 minutes (owner: ML platform on-call)
- **Mitigate:** Breaker opens and traffic drops to the in-process baseline (Developers writing tests by hand and template generators) at degradation level 2
- **Recover:** Restart or roll back the serving deployment, then close the breaker through half-open probing
- **Then learn:** Add a synthetic probe for the failure path and review autoscaling and readiness checks
- **Last drilled:** ________  **Result:** ________
### RB-02 Model quality deteriorates

- **Detect:** Matured-label metric (Coverage of critical code), score-distribution and PSI drift, slice floors
- **Alert:** Ticket on drift, page on a guardrail breach (owner: DevTools AI model owner)
- **Mitigate:** Move thresholds to a conservative setting or promote the warm previous champion
- **Recover:** Train a challenger on the latest matured window and pass the promotion gates
- **Then learn:** Add the offline-online trap "Coverage as the goal" to the regression suite
- **Last drilled:** ________  **Result:** ________
### RB-03 Upstream snapshot is unavailable

- **Detect:** Manifest missing or row count outside tolerance before the run
- **Alert:** Alert the data owner and the run orchestrator (owner: Developer experience)
- **Mitigate:** Hold the run and publish the last good output flagged as stale
- **Recover:** Re-run from the corrected snapshot in the standby region
- **Then learn:** Add the manifest check to the producer contract
- **Last drilled:** ________  **Result:** ________
### RB-04 Training pipeline fails

- **Detect:** Pipeline run state and the absence of a new registry version at the expected time
- **Alert:** Ticket to the pipeline owner; page if two consecutive runs fail (owner: DevTools AI model owner)
- **Mitigate:** Keep the current champion and freeze automatic promotion
- **Recover:** Re-run from the last good dataset snapshot after fixing the cause
- **Then learn:** Add a contract or resource test for the failing step
- **Last drilled:** ________  **Result:** ________
### RB-05 Data source stops sending records

- **Detect:** Volume and freshness anomaly on Coverage gap inputs against the data contract
- **Alert:** Alert the data owner after one missed freshness window (owner: Developer experience)
- **Mitigate:** Mark dependent features stale, degrade one level and tell the decision owner
- **Recover:** Backfill into a versioned namespace once the source recovers, then flip the pointer
- **Then learn:** Tighten the contract SLA and add a consumer-side freshness alert
- **Last drilled:** ________  **Result:** ________
### RB-06 New model produces unexpected predictions

- **Detect:** Shadow disagreement rate, score-distribution shift and canary guardrails
- **Alert:** Automatic halt of the canary and a page to the model owner (owner: DevTools AI model owner)
- **Mitigate:** Automatic rollback to the previous version
- **Recover:** Freeze promotion, diagnose on the logged feature vectors and fix
- **Then learn:** Add the failing cases to the golden set and the promotion gate
- **Last drilled:** ________  **Result:** ________
### RB-07 LLM provider experiences an outage

- **Detect:** Provider error rate and latency at the gateway; synthetic prompts
- **Alert:** Page L2 when error rate exceeds 5% for 3 minutes (owner: AI platform on-call)
- **Mitigate:** Gateway fails over to the secondary provider or the small self-hosted model and degrades long-context features
- **Recover:** Return to the primary after a half-open probe passes, and replay queued requests that can safely wait
- **Then learn:** Run a provider-failover game day and keep evaluation results for the fallback model current
- **Last drilled:** ________  **Result:** ________
### RB-08 GPU resources are exhausted

- **Detect:** GPU workers utilisation, queue depth and queue wait against the remaining deadline
- **Alert:** Page L2 when queue wait exceeds 30% of the deadline (owner: SRE / ML platform)
- **Mitigate:** Adaptive concurrency limits shed background and retry traffic first, then route low-value requests to the cheaper tier
- **Recover:** Scale out the node pool, or fall back to a smaller model while capacity is requested, then lift limits gradually
- **Then learn:** Revisit the capacity model with real peak data and set autoscaling on queue depth
- **Last drilled:** ________  **Result:** ________
### RB-09 An agent executes an incorrect action

- **Detect:** Verifier rejections, approval-rejection rate and anomalies in the tool-call audit log
- **Alert:** Page the agent owner on any write action outside policy (owner: AI platform on-call with the business owner)
- **Mitigate:** Revoke the tool scope and drop the agent to read-only (L0)
- **Recover:** Apply the compensating action through the idempotent reversal path and restore from the ledger if needed
- **Then learn:** Add the trace to the replay set and tighten the policy engine before restoring autonomy
- **Last drilled:** ________  **Result:** ________
### RB-10 A regional cloud outage occurs

- **Detect:** Synthetic probes from all regions and the control-plane health feed
- **Alert:** Page SRE and the incident commander (owner: SRE / incident commander)
- **Mitigate:** The inference plane serves from the remaining regions (N+1 sizing); the state plane follows single-writer failover
- **Recover:** Meet RTO 2 hours (one run window); verify RPO Last completed daily partition; fail back after reconciliation
- **Then learn:** Run quarterly game days and record measured RTO and RPO
- **Last drilled:** ________  **Result:** ________

## Degradation ladder

| Level | Trigger | Behaviour |
|---|---|---|
| 0 | Healthy | Full run inside the window, outputs published atomically. |
| 1 | Run would breach the window | Process high-value partitions first, defer the long tail to the next window with staleness flags. |
| 2 | Data-quality gate fails | Keep previous outputs, mark them stale in the manifest, page the owning team. |
| 3 | Model artifact invalid or drift alarm | Pin the previous champion and freeze automated retraining until reviewed. |

## Failure and retry behaviour

| Failure | Behaviour |
|---|---|
| A tool call fails or times out | Retry idempotent reads once; never retry a write without its idempotency key; after the second failure checkpoint and escalate with the missing evidence. |
| The agent loops or exceeds its step or cost budget | Hard stop enforced outside the model, hand off with the partial trace, count as a failed task in evaluation. |
| The process crashes mid-task | Resume from the last checkpoint; completed steps are not repeated because each step is keyed by (task_id, step_no). |
| Approver does not respond | The task stays AWAITING_APPROVAL with an SLA timer; it escalates to a second approver and never auto-approves. |
| Model output does not parse into a valid tool call | Reject, re-prompt once with the schema error, then escalate; never execute a best-effort parse. |

## Security model

- **Surface:** Tool permissions<br>**Control:** Typed tools with a per-principal allow-list; write tools create requests that a named approver releases.
- **Surface:** Prompt injection through tool results<br>**Control:** All tool output is untrusted data; allow-list is fixed per task and cannot be extended by content.
- **Surface:** Credentials<br>**Control:** The agent never holds credentials; tools run under scoped, short-lived service identities.
- **Surface:** Audit<br>**Control:** Every prompt, tool call, result and decision is stored immutably with trace id and model version.
- **Surface:** Data minimisation<br>**Control:** Tools return only the fields the task needs, with identifiers tokenised.

## Test scenarios for the running system

| Scenario | Kind | Assertion |
|---|---|---|
| Replay set of labelled tasks | replay | Task success and evidence validity meet the gate for the current autonomy level. |
| Planted instruction in a tool result | safety | The agent does not follow it, the tool allow-list is unchanged and the record is flagged. |
| Crash and resume | integration | After a kill at step 3 the task resumes at step 3 and no write is applied twice. |
| Step and cost budget exhaustion | unit | The run stops at the budget and escalates with the partial trace. |
| Approval gate | contract | A write action cannot execute without an approval record at autonomy levels below L2. |

## Retraining

### Triggers

- Quality on matured labels falls below the guardrail (Coverage of critical code) for two consecutive windows
- Feature drift (PSI above 0.2 on a top feature) together with a prediction-distribution shift
- A scheduled refresh (per run window) so the model never ages past its label horizon
- An upstream contract or semantic change in a source dataset

- **Data Maturity:** Train only on windows whose labels have matured (production defects and security incidents that appear weeks or months after a change ships); treat the rest as censored and never as negatives.
- **Champion Challenger:** The challenger must match or beat the champion on a frozen time-forward holdout and on every protected slice, survive a shadow window, then pass canary guardrails before promotion.

## Lifecycle controls

| Area | Practice | Artifact | Gate |
|---|---|---|---|
| Experiment management | Track every run of An agent that proposes tests (MLflow or equivalent): code commit, data snapshot id, hyperparameters, seeds, environment lock and metrics (Mutation score of generated tests); cap and log hyperparameter-search budgets. | Run record and reproducibility manifest | A promoted model can be rebuilt from its manifest within metric tolerance |
| Data and feature lifecycle | Validate inputs (Great Expectations, Deequ or pandera), define features such as Coverage gap once in a feature registry, test offline-online consistency and version datasets with lakehouse snapshots. | Dataset snapshot id, feature definitions and validation report | No training on data that fails its contract |
| Model lifecycle management | Keep every version in a registry with model card, signed artifact, lineage and an approval workflow matched to the risk tier. | Registry version and model card | Approvals for tier "high" are complete |
| ML CI/CD and continuous training | CI runs transform unit tests, contract tests and a training smoke test on synthetic data; CD builds, scans and signs the image; CT retrains on schedule or trigger and runs automated evaluation and promotion gates. | Pipeline run with evaluation report | Challenger beats champion on the frozen holdout and on every protected slice |
| Deployment and release management | Package the job as a container, orchestrate with Airflow or Dagster, publish partitions atomically and promote by dry-run, shadow run and then cut-over. | Release record with canary results | p99, error rate and cost per 1,000 decisions stay within budget through the canary |
| Monitoring and observability | Track data drift, feature drift, prediction drift and, once labels mature, concept drift and model quality per slice, together with latency, throughput and cost. | Dashboards, alerts and SLO definitions | Alerts and owners exist before launch; drift without a quality drop opens an investigation, not a retrain |
| Retraining and rollback | Retrain on matured labels only (labels here: production defects and security incidents that appear weeks or months after a change ships); run champion/challenger evaluation; keep the previous champion warm; retire models with no traffic. | Retrain decision record | Rollback to the previous champion is one step and rehearsed each quarter |
| Infrastructure and platform operations | Terraform for infrastructure, secrets in a vault, environment promotion dev → staging → production, and autoscaling on queue depth for 2 GPU workers with utilisation targets and a tested disaster-recovery path. | IaC repository and capacity plan | Environments are reproducible from code and failover is exercised |
| Operational governance | Maintain artifact lineage, access controls, audit logs, approvals, the model inventory and a release-evidence bundle per version. | Release evidence bundle | Every production version has a complete evidence bundle |

## Toolchain options

| Concern | Options |
|---|---|
| Experiment tracking and registry | MLflow, Weights & Biases, SageMaker or Vertex model registry |
| Pipelines and orchestration | Airflow, Dagster, Kubeflow Pipelines, Spark on Kubernetes |
| Feature store and data validation | Feast, Tecton or a managed store; Great Expectations, Deequ, pandera |
| Serving and release | vLLM, TensorRT-LLM, KServe behind an LLM gateway |
| Monitoring | Prometheus and Grafana, OpenTelemetry, Evidently or WhyLabs for drift |
| Infrastructure and secrets | Terraform or Pulumi, Kubernetes, HashiCorp Vault or cloud KMS |

## Capacity statement (modelled)

2 GPU workers provisioned for 3,000,000 rows per run (52.1% planned utilisation at peak). Autoscale on queue depth and queue wait, load-test at 1.2× provisioned before peak seasons, and re-run the sizing calculator with real traffic each quarter.

## Unit costs (modelled)

| Unit | Value | How |
|---|---|---|
| Cost per repository, pull request or pipeline run | $0.000038 | Monthly run cost ÷ monthly decisions (modelled; on-demand list prices) |
| Cost per 1,000 decisions | $0.038 | Published in the capacity table and re-run live in the sizing calculator |
| Modelled monthly run cost at 10M users | $3.4K | Compute + platform overhead + cache and bus + storage |
| Infrastructure cost per daily active user per month | $0.0011 | Monthly run cost ÷ daily active users |

## Game-day log

| Date | Scenario (RB-xx) | What happened | Time to detect | Time to recover | Actions |
|---|---|---|---|---|---|
| | | | | | |
