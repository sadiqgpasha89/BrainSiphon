# Statistical Process Control Drift Detection: operations runbook

> Generated from the blueprint `manufacturing/spc-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Statistical Process Control Drift Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

What the on-call engineer needs at 3 a.m.: objectives, alerts, the first steps for each known failure, how to roll back, and what each decision costs.

## Service level objectives

| Indicator | Objective | Window | Error budget |
|---|---|---|---|
| Share of valid requests answered inside the deadline | 99.95% over 30 days | 30 days | 21.6 minutes of unavailability per 30 days |
| End-to-end latency | p50 ≤ 875 ms, p95 ≤ 1750 ms, p99 ≤ 2500 ms | 30 days, per region | 1% of requests may exceed p99; burn-rate alerts at 2% in 1 hour |
| Input freshness at the consumer | p95 event-to-feature delay inside the contract | Rolling 1 day | Two breaches per week before the data owner is escalated |
| Model quality on matured labels | Time from drift onset to action within guardrail | Weekly, per slice | No slice below its floor for two consecutive windows |
| Decisions served from a degraded path | ≤ 1% of decisions below degradation level 1 | 30 days | 1% of decisions; a breach triggers a review of the ladder |
| Cost per 1,000 decisions | ≤ $0.0015 | Monthly | 20% over the modelled cost before FinOps review |

## Telemetry to collect

| Layer | Signals |
|---|---|
| Model | Score and calibration distributions, drift (PSI/KS) per feature, slice metrics, challenger agreement |
| Data | Freshness, volume, schema and null-rate per contract, quarantine counts, late-event share |
| Infrastructure | 8-vCPU pods utilisation, queue depth, memory, replica lag, event-bus consumer lag |
| Application | Per-stage latency (Measurement ingestion, Stream segmentation by tool and product, Drift detectors), error rate by dependency, fallback level, decisions by action |

## Severities

| Sev | Definition | Response |
|---|---|---|
| SEV1 | Decisions are wrong, unavailable or unsafe for many machine or production lots, or a regulatory obligation is at risk | Page immediately, incident commander named, 15 minute acknowledgement, executive update every 30 minutes |
| SEV2 | Degraded path in use, a guardrail is breaching or one region or tenant is affected | Page L2, 30 minute acknowledgement, fix within the working day |
| SEV3 | Drift warning, non-critical dependency failure or a single failed run with a safe fallback | Ticket to the owning team, fixed within the sprint |

## Support model

| Level | Owns |
|---|---|
| L1 | Watch dashboards, follow runbooks, restart jobs, open and route tickets |
| L2 | ML platform on-call: rollbacks, backfills, scaling, breaker and feature-store operations |
| L3 | Manufacturing AI model and data owners: quality diagnosis, retraining, contract changes; vendors engaged here only |

## Release and rollback

- **Deploy:** Signed image and model artifact promoted through GitOps; blue-green for the serving plane; shadow then canary (1%, 5%, 25%, 100%) with automatic halt on SLO or guardrail breach.
- **Rollback:** One-step revert to the previous registry version and serving revision, with backward-compatible schema migrations only; rollback is rehearsed every quarter.

**Rollback paths**

- Automatic rollback to the previous registry version on SLO or guardrail breach during canary
- Manual one-step rollback with the previous champion kept warm and signature-verified
- Feature-pipeline rollback by flipping the versioned namespace pointer back
- If the new version corrupted decisions, replay affected inputs through the previous version and correct downstream records from the ledger

## Runbook entries

### RB-01 Model endpoint becomes unavailable

- **Detect:** Health probes and error rate on Stream segmentation by tool and product; breaker state
- **Alert:** Page L2 when errors exceed 2% for 2 minutes (owner: ML platform on-call)
- **Mitigate:** Breaker opens and traffic drops to the in-process baseline (Shewhart X-bar and R charts with standard run rules) at degradation level 2
- **Recover:** Restart or roll back the serving deployment, then close the breaker through half-open probing
- **Then learn:** Add a synthetic probe for the failure path and review autoscaling and readiness checks
- **Last drilled:** ________  **Result:** ________
### RB-02 Model quality deteriorates

- **Detect:** Matured-label metric (Time from drift onset to action), score-distribution and PSI drift, slice floors
- **Alert:** Ticket on drift, page on a guardrail breach (owner: Manufacturing AI model owner)
- **Mitigate:** Move thresholds to a conservative setting or promote the warm previous champion
- **Recover:** Train a challenger on the latest matured window and pass the promotion gates
- **Then learn:** Add the offline-online trap "One limit for mixed populations" to the regression suite
- **Last drilled:** ________  **Result:** ________
### RB-03 Upstream snapshot is unavailable

- **Detect:** Manifest missing or row count outside tolerance before the run
- **Alert:** Alert the data owner and the run orchestrator (owner: Plant operations)
- **Mitigate:** Hold the run and publish the last good output flagged as stale
- **Recover:** Re-run from the corrected snapshot in the standby region
- **Then learn:** Add the manifest check to the producer contract
- **Last drilled:** ________  **Result:** ________
### RB-04 Training pipeline fails

- **Detect:** Pipeline run state and the absence of a new registry version at the expected time
- **Alert:** Ticket to the pipeline owner; page if two consecutive runs fail (owner: Manufacturing AI model owner)
- **Mitigate:** Keep the current champion and freeze automatic promotion
- **Recover:** Re-run from the last good dataset snapshot after fixing the cause
- **Then learn:** Add a contract or resource test for the failing step
- **Last drilled:** ________  **Result:** ________
### RB-05 Data source stops sending records

- **Detect:** Volume and freshness anomaly on CUSUM statistic inputs against the data contract
- **Alert:** Alert the data owner after one missed freshness window (owner: Plant operations)
- **Mitigate:** Mark dependent features stale, degrade one level and tell the decision owner
- **Recover:** Backfill into a versioned namespace once the source recovers, then flip the pointer
- **Then learn:** Tighten the contract SLA and add a consumer-side freshness alert
- **Last drilled:** ________  **Result:** ________
### RB-06 New model produces unexpected predictions

- **Detect:** Shadow disagreement rate, score-distribution shift and canary guardrails
- **Alert:** Automatic halt of the canary and a page to the model owner (owner: Manufacturing AI model owner)
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

- **Detect:** 8-vCPU pods utilisation, queue depth and queue wait against the remaining deadline
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
- **Mitigate:** The inference plane serves from the remaining regions (N+1 sizing); the state plane follows single-writer failover
- **Recover:** Meet RTO 5 minutes (region evacuation), under 60 seconds for request routing; verify RPO Up to 60 seconds of feature state; exact counters have a single writer per key; fail back after reconciliation
- **Then learn:** Run quarterly game days and record measured RTO and RPO
- **Last drilled:** ________  **Result:** ________

## Degradation ladder

| Level | Trigger | Behaviour |
|---|---|---|
| 0 | Healthy | Full agent / pipeline with tools, retrieval and primary model. |
| 1 | Tool or retrieval dependency slow | Cap steps, skip non-essential tools, answer from cached context with an explicit caveat. |
| 2 | Primary model rate-limited or over budget | Route to a smaller or secondary-provider model; semantic cache for repeated intents. |
| 3 | Generation unavailable | Retrieval-only / templated answer with citations, no free-form generation. |
| 4 | Guardrail or policy service down | Fail closed for risky actions, hand off to a human queue with full transcript. |

## Failure and retry behaviour

| Failure | Behaviour |
|---|---|
| Feature store slow or unavailable | Serve with cached or stale features (age stamped on the decision) inside the sub-budget; Idempotency-Key header: the first response is stored for the key and replayed on retry. |
| Champion model breaker opens | Route to the distilled fallback or last-known-good version; the decision carries degraded = true. |
| Caller times out and retries | The idempotency key returns the first decision; the retry is never scored twice. |
| Decision log or event bus unavailable | Buffer locally with drop-oldest and a counter alert; the response never waits on emission. |
| Whole serving plane unreachable | Caller-side default (fail-open or fail-closed by risk appetite) plus a sampled post-hoc review queue. |

## Security model

- **Surface:** API authentication<br>**Control:** mTLS between services and short-lived signed tokens; per-client rate limits and quotas.
- **Surface:** Authorisation<br>**Control:** Callers may only decide for entities in their scope; policy thresholds are config changeable only through reviewed change requests.
- **Surface:** Sensitive attributes<br>**Control:** Tokenised identifiers in features and logs; protected attributes excluded from the model and used only for fairness monitoring.
- **Surface:** Decision log<br>**Control:** Append-only, access-audited; retention and deletion follow the data-classification policy.
- **Surface:** Model artifacts<br>**Control:** Signed and pulled by digest; a new version cannot serve without passing the registry gates.

## Test scenarios for the running system

| Scenario | Kind | Assertion |
|---|---|---|
| Point-in-time feature correctness | unit | Training and serving transforms produce identical values for the same as_of. |
| Latency under deadline propagation | load | p99 stays inside the budget at provisioned peak with one region down. |
| Fallback ladder | integration | Killing the feature store, then the model, walks the ladder one level at a time with degraded = true. |
| Idempotent retries | contract | The same Idempotency-Key returns the identical decision and writes one ledger row. |
| Threshold change replay | replay | A proposed threshold is replayed on a week of traffic and its cost-weighted effect is within the approved range. |
| Delayed-label reconciliation | integration | A label arriving late joins to the exact decision snapshot that produced it. |

## Retraining

### Triggers

- Quality on matured labels falls below the guardrail (Time from drift onset to action) for two consecutive windows
- Feature drift (PSI above 0.2 on a top feature) together with a prediction-distribution shift
- A scheduled refresh (monthly) so the model never ages past its label horizon
- An upstream contract or semantic change in a source dataset

- **Data Maturity:** Train only on windows whose labels have matured (field failures and warranty claims that appear months after shipment, and quality escapes found at the customer); treat the rest as censored and never as negatives.
- **Champion Challenger:** The challenger must match or beat the champion on a frozen time-forward holdout and on every protected slice, survive a shadow window, then pass canary guardrails before promotion.

## Lifecycle controls

| Area | Practice | Artifact | Gate |
|---|---|---|---|
| Experiment management | Track every run of Per-stream EWMA and CUSUM detectors with change-point detection on tool-segmented data (MLflow or equivalent): code commit, data snapshot id, hyperparameters, seeds, environment lock and metrics (Average run length to detect a seeded shift); cap and log hyperparameter-search budgets. | Run record and reproducibility manifest | A promoted model can be rebuilt from its manifest within metric tolerance |
| Data and feature lifecycle | Validate inputs (Great Expectations, Deequ or pandera), define features such as CUSUM statistic once in a feature registry, test offline-online consistency and version datasets with lakehouse snapshots. | Dataset snapshot id, feature definitions and validation report | No training on data that fails its contract |
| Model lifecycle management | Keep every version in a registry with model card, signed artifact, lineage and an approval workflow matched to the risk tier. | Registry version and model card | Approvals for tier "medium" are complete |
| ML CI/CD and continuous training | CI runs transform unit tests, contract tests and a training smoke test on synthetic data; CD builds, scans and signs the image; CT retrains on schedule or trigger and runs automated evaluation and promotion gates. | Pipeline run with evaluation report | Challenger beats champion on the frozen holdout and on every protected slice |
| Deployment and release management | Containerise (Docker), deploy on Kubernetes with stream processor; use blue-green for the serving plane and shadow then canary (1%, 5%, 25%, 100%) for models. | Release record with canary results | p99, error rate and cost per 1,000 decisions stay within budget through the canary |
| Monitoring and observability | Track data drift, feature drift, prediction drift and, once labels mature, concept drift and model quality per slice, together with latency, throughput and cost. | Dashboards, alerts and SLO definitions | Alerts and owners exist before launch; drift without a quality drop opens an investigation, not a retrain |
| Retraining and rollback | Retrain on matured labels only (labels here: field failures and warranty claims that appear months after shipment, and quality escapes found at the customer); run champion/challenger evaluation; keep the previous champion warm; retire models with no traffic. | Retrain decision record | Rollback to the previous champion is one step and rehearsed each quarter |
| Infrastructure and platform operations | Terraform for infrastructure, secrets in a vault, environment promotion dev → staging → production, and autoscaling on queue depth for 8 8-vCPU pods with utilisation targets and a tested disaster-recovery path. | IaC repository and capacity plan | Environments are reproducible from code and failover is exercised |
| Operational governance | Maintain artifact lineage, access controls, audit logs, approvals, the model inventory and a release-evidence bundle per version. | Release evidence bundle | Every production version has a complete evidence bundle |

## Toolchain options

| Concern | Options |
|---|---|
| Experiment tracking and registry | MLflow, Weights & Biases, SageMaker or Vertex model registry |
| Pipelines and orchestration | Kubeflow Pipelines, Argo Workflows, Airflow, Flyte |
| Feature store and data validation | Feast, Tecton or a managed store; Great Expectations, Deequ, pandera |
| Serving and release | Triton, KServe, Seldon, BentoML, ONNX Runtime |
| Monitoring | Prometheus and Grafana, OpenTelemetry, Evidently or WhyLabs for drift |
| Infrastructure and secrets | Terraform or Pulumi, Kubernetes, HashiCorp Vault or cloud KMS |

## Capacity statement (modelled)

8 8-vCPU pods provisioned for 18,750 req/s (93.8% planned utilisation at peak). Autoscale on queue depth and queue wait, load-test at 1.2× provisioned before peak seasons, and re-run the sizing calculator with real traffic each quarter.

## Unit costs (modelled)

| Unit | Value | How |
|---|---|---|
| Cost per machine or production lot | $0.0000012 | Monthly run cost ÷ monthly decisions (modelled; on-demand list prices) |
| Cost per 1,000 decisions | $0.0012 | Published in the capacity table and re-run live in the sizing calculator |
| Modelled monthly run cost at 10M users | $6.6K | Compute + platform overhead + cache and bus + storage |
| Infrastructure cost per daily active user per month | $0.0022 | Monthly run cost ÷ daily active users |

## Game-day log

| Date | Scenario (RB-xx) | What happened | Time to detect | Time to recover | Actions |
|---|---|---|---|---|---|
| | | | | | |
