# Facility Access Pattern Anomaly Detection: operations runbook

> Generated from the blueprint `healthcare/facility-access-pattern-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Facility Access Pattern Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

What the on-call engineer needs at 3 a.m.: objectives, alerts, the first steps for each known failure, how to roll back, and what each decision costs.

## Service level objectives

| Indicator | Objective | Window | Error budget |
|---|---|---|---|
| Share of valid requests answered inside the deadline | Run completes inside the 2 hour window on 99% of days | 30 days | ≈ 7 late runs per year |
| End-to-end latency | Run duration p95 within 70% of the window | 30 days, per region | Any run over the window |
| Input freshness at the consumer | All inputs landed before the run opens | Rolling 1 day | Two breaches per week before the data owner is escalated |
| Model quality on matured labels | Confirmed findings per 1000 alerts within guardrail | Weekly, per slice | No slice below its floor for two consecutive windows |
| Decisions served from a degraded path | ≤ 1% of decisions below degradation level 1 | 30 days | 1% of decisions; a breach triggers a review of the ladder |
| Cost per 1,000 decisions | ≤ $0.023 | Monthly | 20% over the modelled cost before FinOps review |

## Telemetry to collect

| Layer | Signals |
|---|---|
| Model | Score and calibration distributions, drift (PSI/KS) per feature, slice metrics, challenger agreement |
| Data | Freshness, volume, schema and null-rate per contract, quarantine counts, late-event share |
| Infrastructure | 8-vCPU Spark executors utilisation, queue depth, memory, replica lag, event-bus consumer lag |
| Application | Per-stage latency (Access event intake, Policy rule checks, Context joiner for shifts and roles), error rate by dependency, fallback level, decisions by action |

## Severities

| Sev | Definition | Response |
|---|---|---|
| SEV1 | Decisions are wrong, unavailable or unsafe for many patient encounters, or a regulatory obligation is at risk | Page immediately, incident commander named, 15 minute acknowledgement, executive update every 30 minutes |
| SEV2 | Degraded path in use, a guardrail is breaching or one region or tenant is affected | Page L2, 30 minute acknowledgement, fix within the working day |
| SEV3 | Drift warning, non-critical dependency failure or a single failed run with a safe fallback | Ticket to the owning team, fixed within the sprint |

## Support model

| Level | Owns |
|---|---|
| L1 | Watch dashboards, follow runbooks, restart jobs, open and route tickets |
| L2 | ML platform on-call: rollbacks, backfills, scaling, breaker and feature-store operations |
| L3 | Clinical Informatics model and data owners: quality diagnosis, retraining, contract changes; vendors engaged here only |

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

- **Detect:** Health probes and error rate on Sequence and graph anomaly model; breaker state
- **Alert:** Page L2 when errors exceed 2% for 2 minutes (owner: ML platform on-call)
- **Mitigate:** Breaker opens and traffic drops to the in-process baseline (A report of badge use outside the shift window) at degradation level 2
- **Recover:** Restart or roll back the serving deployment, then close the breaker through half-open probing
- **Then learn:** Add a synthetic probe for the failure path and review autoscaling and readiness checks
- **Last drilled:** ________  **Result:** ________
### RB-02 Model quality deteriorates

- **Detect:** Matured-label metric (Confirmed findings per 1000 alerts), score-distribution and PSI drift, slice floors
- **Alert:** Ticket on drift, page on a guardrail breach (owner: Clinical Informatics model owner)
- **Mitigate:** Move thresholds to a conservative setting or promote the warm previous champion
- **Recover:** Train a challenger on the latest matured window and pass the promotion gates
- **Then learn:** Add the offline-online trap "Treating anomalies as violations" to the regression suite
- **Last drilled:** ________  **Result:** ________
### RB-03 Feature store becomes unavailable

- **Detect:** Context joiner for shifts and roles p99 above its sub-budget, error rate and replica lag
- **Alert:** Page L2 when lookups time out for more than 1 minute (owner: ML platform on-call)
- **Mitigate:** Serve cached features stamped as stale and use the payload-only model; skip optional enrichment
- **Recover:** Fail over to the replica or restore the shard, then re-warm the cache
- **Then learn:** Rehearse the stale-feature path monthly and track the share of decisions made on stale data
- **Last drilled:** ________  **Result:** ________
### RB-04 Training pipeline fails

- **Detect:** Pipeline run state and the absence of a new registry version at the expected time
- **Alert:** Ticket to the pipeline owner; page if two consecutive runs fail (owner: Clinical Informatics model owner)
- **Mitigate:** Keep the current champion and freeze automatic promotion
- **Recover:** Re-run from the last good dataset snapshot after fixing the cause
- **Then learn:** Add a contract or resource test for the failing step
- **Last drilled:** ________  **Result:** ________
### RB-05 Data source stops sending records

- **Detect:** Volume and freshness anomaly on Path novelty inputs against the data contract
- **Alert:** Alert the data owner after one missed freshness window (owner: Facility security)
- **Mitigate:** Mark dependent features stale, degrade one level and tell the decision owner
- **Recover:** Backfill into a versioned namespace once the source recovers, then flip the pointer
- **Then learn:** Tighten the contract SLA and add a consumer-side freshness alert
- **Last drilled:** ________  **Result:** ________
### RB-06 New model produces unexpected predictions

- **Detect:** Shadow disagreement rate, score-distribution shift and canary guardrails
- **Alert:** Automatic halt of the canary and a page to the model owner (owner: Clinical Informatics model owner)
- **Mitigate:** Automatic rollback to the previous version
- **Recover:** Freeze promotion, diagnose on the logged feature vectors and fix
- **Then learn:** Add the failing cases to the golden set and the promotion gate
- **Last drilled:** ________  **Result:** ________
### RB-07 A third-party dependency is unavailable

- **Detect:** Per-dependency error rate, timeout rate and breaker state
- **Alert:** Page L2 when a breaker stays open for 5 minutes (owner: ML platform on-call)
- **Mitigate:** Open the breaker and use cached or default values with a flag; shed non-critical enrichment
- **Recover:** Close the breaker through half-open probes after the dependency recovers
- **Then learn:** Record the dependency in the service map with its fallback and contract
- **Last drilled:** ________  **Result:** ________
### RB-08 Compute capacity is exhausted

- **Detect:** 8-vCPU Spark executors utilisation, queue depth and queue wait against the remaining deadline
- **Alert:** Page L2 when queue wait exceeds 30% of the deadline (owner: SRE / ML platform)
- **Mitigate:** Adaptive concurrency limits shed background and retry traffic first, then route low-value requests to the cheaper tier
- **Recover:** Scale out the node pool, then lift limits gradually
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
- **Mitigate:** The inference plane serves from the remaining regions (N+1 sizing); the state plane follows fenced failover to the in-country standby
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
| Input freshness or completeness gate fails | Fail the run, keep the previous outputs marked stale and page the owner; no partial publish. |
| A partition fails | Retry the partition with backoff; outputs are written by (run_id, partition) so retries are idempotent. |
| Run exceeds its window | Publish completed partitions in priority order, defer the tail with staleness flags. |
| Row counts do not reconcile (rows_in ≠ rows_out + quarantined) | Block publication and open an incident - silent row loss is a defect, not a warning. |
| Downstream consumer reads mid-run | Publish atomically by manifest swap so consumers never see a half-written run. |

## Security model

- **Surface:** Input access<br>**Control:** Read-only, column-scoped roles; sensitive columns are masked or tokenised in the job.
- **Surface:** Output access<br>**Control:** Consumers read through governed views; row-level policy for restricted entities.
- **Surface:** Job identity<br>**Control:** One service identity per job with no interactive credentials; secrets from a manager.
- **Surface:** Reproducibility<br>**Control:** Code version, model digest and input snapshot ids are written into the manifest.

## Test scenarios for the running system

| Scenario | Kind | Assertion |
|---|---|---|
| Reconciliation | integration | rows_in equals rows_out plus rows_quarantined on every run. |
| Idempotent rerun | integration | Rerunning a run date produces identical outputs and the same manifest content hash. |
| Schema drift in an input | contract | A renamed or retyped column fails the data contract check before scoring. |
| Backfill isolation | integration | A historical backfill never overwrites the current published run. |
| Score and distribution regression | replay | Score distribution and top-band rate stay within the agreed bounds against the previous run. |
| Full-volume timing | load | The largest day completes inside the window with headroom. |

## Retraining

### Triggers

- Quality on matured labels falls below the guardrail (Confirmed findings per 1000 alerts) for two consecutive windows
- Feature drift (PSI above 0.2 on a top feature) together with a prediction-distribution shift
- A scheduled refresh (per run window) so the model never ages past its label horizon
- An upstream contract or semantic change in a source dataset

- **Data Maturity:** Train only on windows whose labels have matured (outcomes such as 30-day readmission or mortality that arrive after discharge); treat the rest as censored and never as negatives.
- **Champion Challenger:** The challenger must match or beat the champion on a frozen time-forward holdout and on every protected slice, survive a shadow window, then pass canary guardrails before promotion.

## Lifecycle controls

| Area | Practice | Artifact | Gate |
|---|---|---|---|
| Experiment management | Track every run of Policy checks first (MLflow or equivalent): code commit, data snapshot id, hyperparameters, seeds, environment lock and metrics (Precision and recall of triaged findings at the alert budget); cap and log hyperparameter-search budgets. | Run record and reproducibility manifest | A promoted model can be rebuilt from its manifest within metric tolerance |
| Data and feature lifecycle | Validate inputs (Great Expectations, Deequ or pandera), define features such as Path novelty once in a feature registry, test offline-online consistency and version datasets with lakehouse snapshots. | Dataset snapshot id, feature definitions and validation report | No training on data that fails its contract |
| Model lifecycle management | Keep every version in a registry with model card, signed artifact, lineage and an approval workflow matched to the risk tier. | Registry version and model card | Approvals for tier "critical" are complete |
| ML CI/CD and continuous training | CI runs transform unit tests, contract tests and a training smoke test on synthetic data; CD builds, scans and signs the image; CT retrains on schedule or trigger and runs automated evaluation and promotion gates. | Pipeline run with evaluation report | Challenger beats champion on the frozen holdout and on every protected slice |
| Deployment and release management | Package the job as a container, orchestrate with Airflow or Dagster, publish partitions atomically and promote by dry-run, shadow run and then cut-over. | Release record with canary results | p99, error rate and cost per 1,000 decisions stay within budget through the canary |
| Monitoring and observability | Track data drift, feature drift, prediction drift and, once labels mature, concept drift and model quality per slice, together with latency, throughput and cost. | Dashboards, alerts and SLO definitions | Alerts and owners exist before launch; drift without a quality drop opens an investigation, not a retrain |
| Retraining and rollback | Retrain on matured labels only (labels here: outcomes such as 30-day readmission or mortality that arrive after discharge); run champion/challenger evaluation; keep the previous champion warm; retire models with no traffic. | Retrain decision record | Rollback to the previous champion is one step and rehearsed each quarter |
| Infrastructure and platform operations | Terraform for infrastructure, secrets in a vault, environment promotion dev → staging → production, and autoscaling on queue depth for 2 8-vCPU Spark executors with utilisation targets and a tested disaster-recovery path. | IaC repository and capacity plan | Environments are reproducible from code and failover is exercised |
| Operational governance | Maintain artifact lineage, access controls, audit logs, approvals, the model inventory and a release-evidence bundle per version. | Release evidence bundle | Every production version has a complete evidence bundle |

## Toolchain options

| Concern | Options |
|---|---|
| Experiment tracking and registry | MLflow, Weights & Biases, SageMaker or Vertex model registry |
| Pipelines and orchestration | Airflow, Dagster, Kubeflow Pipelines, Spark on Kubernetes |
| Feature store and data validation | Feast, Tecton or a managed store; Great Expectations, Deequ, pandera |
| Serving and release | Triton, KServe, Seldon, BentoML, ONNX Runtime |
| Monitoring | Prometheus and Grafana, OpenTelemetry, Evidently or WhyLabs for drift |
| Infrastructure and secrets | Terraform or Pulumi, Kubernetes, HashiCorp Vault or cloud KMS |

## Capacity statement (modelled)

2 8-vCPU Spark executors provisioned for 3,000,000 rows per run (0.5% planned utilisation at peak). Autoscale on queue depth and queue wait, load-test at 1.2× provisioned before peak seasons, and re-run the sizing calculator with real traffic each quarter.

## Unit costs (modelled)

| Unit | Value | How |
|---|---|---|
| Cost per patient encounter | $0.000019 | Monthly run cost ÷ monthly decisions (modelled; on-demand list prices) |
| Cost per 1,000 decisions | $0.019 | Published in the capacity table and re-run live in the sizing calculator |
| Modelled monthly run cost at 10M users | $1.7K | Compute + platform overhead + cache and bus + storage |
| Infrastructure cost per daily active user per month | $0.00056 | Monthly run cost ÷ daily active users |

## Game-day log

| Date | Scenario (RB-xx) | What happened | Time to detect | Time to recover | Actions |
|---|---|---|---|---|---|
| | | | | | |
