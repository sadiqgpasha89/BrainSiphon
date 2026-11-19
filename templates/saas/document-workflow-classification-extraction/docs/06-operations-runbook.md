# Document Workflow Classification & Extraction: operations runbook

> Generated from the blueprint `saas/document-workflow-classification-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Document Workflow Classification & Extraction · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

What the on-call engineer needs at 3 a.m.: objectives, alerts, the first steps for each known failure, how to roll back, and what each decision costs.

## Service level objectives

| Indicator | Objective | Window | Error budget |
|---|---|---|---|
| Share of valid requests answered inside the deadline | 99.95% over 30 days | 30 days | 21.6 minutes of unavailability per 30 days |
| End-to-end latency | p50 ≤ 875 ms, p95 ≤ 1750 ms, p99 ≤ 2500 ms | 30 days, per region | 1% of requests may exceed p99; burn-rate alerts at 2% in 1 hour |
| Input freshness at the consumer | p95 event-to-feature delay inside the contract | Rolling 1 day | Two breaches per week before the data owner is escalated |
| Model quality on matured labels | Straight-through processing rate within guardrail | Weekly, per slice | No slice below its floor for two consecutive windows |
| Decisions served from a degraded path | ≤ 1% of decisions below degradation level 1 | 30 days | 1% of decisions; a breach triggers a review of the ladder |
| Cost per 1,000 decisions | ≤ $0.697 | Monthly | 20% over the modelled cost before FinOps review |

## Telemetry to collect

| Layer | Signals |
|---|---|
| Model | Score and calibration distributions, drift (PSI/KS) per feature, slice metrics, challenger agreement |
| Data | Freshness, volume, schema and null-rate per contract, quarantine counts, late-event share |
| Infrastructure | GPUs (L4/L40S class) utilisation, queue depth, memory, replica lag, event-bus consumer lag |
| Application | Per-stage latency (Upload, OCR and layout, Classifier and extractor), error rate by dependency, fallback level, decisions by action |

## Severities

| Sev | Definition | Response |
|---|---|---|
| SEV1 | Decisions are wrong, unavailable or unsafe for many requests, or a regulatory obligation is at risk | Page immediately, incident commander named, 15 minute acknowledgement, executive update every 30 minutes |
| SEV2 | Degraded path in use, a guardrail is breaching or one region or tenant is affected | Page L2, 30 minute acknowledgement, fix within the working day |
| SEV3 | Drift warning, non-critical dependency failure or a single failed run with a safe fallback | Ticket to the owning team, fixed within the sprint |

## Support model

| Level | Owns |
|---|---|
| L1 | Watch dashboards, follow runbooks, restart jobs, open and route tickets |
| L2 | ML platform on-call: rollbacks, backfills, scaling, breaker and feature-store operations |
| L3 | AI Platform model and data owners: quality diagnosis, retraining, contract changes; vendors engaged here only |

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

- **Detect:** Health probes and error rate on OCR and layout; breaker state
- **Alert:** Page L2 when errors exceed 2% for 2 minutes (owner: ML platform on-call)
- **Mitigate:** Breaker opens and traffic drops to the in-process baseline (Template-based extraction per document type) at degradation level 2
- **Recover:** Restart or roll back the serving deployment, then close the breaker through half-open probing
- **Then learn:** Add a synthetic probe for the failure path and review autoscaling and readiness checks
- **Last drilled:** ________  **Result:** ________
### RB-02 Model quality deteriorates

- **Detect:** Matured-label metric (Straight-through processing rate), score-distribution and PSI drift, slice floors
- **Alert:** Ticket on drift, page on a guardrail breach (owner: AI Platform model owner)
- **Mitigate:** Move thresholds to a conservative setting or promote the warm previous champion
- **Recover:** Train a challenger on the latest matured window and pass the promotion gates
- **Then learn:** Add the offline-online trap "Test documents from the same templates as training" to the regression suite
- **Last drilled:** ________  **Result:** ________
### RB-03 Upstream snapshot is unavailable

- **Detect:** Manifest missing or row count outside tolerance before the run
- **Alert:** Alert the data owner and the run orchestrator (owner: Product analytics)
- **Mitigate:** Hold the run and publish the last good output flagged as stale
- **Recover:** Re-run from the corrected snapshot in the standby region
- **Then learn:** Add the manifest check to the producer contract
- **Last drilled:** ________  **Result:** ________
### RB-04 Training pipeline fails

- **Detect:** Pipeline run state and the absence of a new registry version at the expected time
- **Alert:** Ticket to the pipeline owner; page if two consecutive runs fail (owner: AI Platform model owner)
- **Mitigate:** Keep the current champion and freeze automatic promotion
- **Recover:** Re-run from the last good dataset snapshot after fixing the cause
- **Then learn:** Add a contract or resource test for the failing step
- **Last drilled:** ________  **Result:** ________
### RB-05 Data source stops sending records

- **Detect:** Volume and freshness anomaly on Field confidence margin inputs against the data contract
- **Alert:** Alert the data owner after one missed freshness window (owner: Product analytics)
- **Mitigate:** Mark dependent features stale, degrade one level and tell the decision owner
- **Recover:** Backfill into a versioned namespace once the source recovers, then flip the pointer
- **Then learn:** Tighten the contract SLA and add a consumer-side freshness alert
- **Last drilled:** ________  **Result:** ________
### RB-06 New model produces unexpected predictions

- **Detect:** Shadow disagreement rate, score-distribution shift and canary guardrails
- **Alert:** Automatic halt of the canary and a page to the model owner (owner: AI Platform model owner)
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
### RB-08 GPU resources are exhausted

- **Detect:** GPUs (L4/L40S class) utilisation, queue depth and queue wait against the remaining deadline
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
- **Mitigate:** The inference plane serves from the remaining regions (N+1 sizing); the state plane follows per-cell failover
- **Recover:** Meet RTO 15 minutes per tenant cell, under 60 seconds for the inference plane; verify RPO Up to 30 seconds of tenant state (asynchronous replication lag); fail back after reconciliation
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
| Inference queue backs up | Drop frames (newest-first policy per source) rather than lag; count drops and alert when the drop rate exceeds its budget. |
| Camera or sensor stream drops | Emit a source-health event; downstream rules treat the gap as unknown, not as clear. |
| GPU node lost mid-batch | Re-queue the batch to another node; frames are idempotent by frame_id so results are not duplicated. |
| Corrupt or unreadable image | Reject with a typed error, store the hash, skip - never crash the worker. |
| Model confidence collapses (lighting or lens change) | Drift monitor trips, route low-confidence frames to human review and pin the previous model if it persists. |

## Security model

- **Surface:** Image storage<br>**Control:** Encrypted buckets, signed short-lived URLs, retention enforced by lifecycle rules.
- **Surface:** Personal data in images<br>**Control:** Faces and plates blurred at ingest where not required; access to raw frames is role-restricted and audited.
- **Surface:** Model artifacts<br>**Control:** Signed engine files; TensorRT or ONNX engines are built in CI and pulled by digest.
- **Surface:** Edge devices<br>**Control:** Device identity and attestation; over-the-air updates are signed and can be rolled back.

## Test scenarios for the running system

| Scenario | Kind | Assertion |
|---|---|---|
| Golden image set per class and per lighting condition | replay | Precision and recall per class meet the gate; no class regresses on the hard-example set. |
| Corrupt and oversized images | unit | Typed rejection, no worker crash, no leak of memory. |
| Frame-drop policy under overload | load | Latency stays inside budget while the drop rate stays inside its limit. |
| Track continuity across occlusion | replay | ID switches per hundred tracks stay under the agreed threshold. |
| Engine build reproducibility | integration | The same weights and build inputs produce an engine with the same digest and accuracy within tolerance. |

## Retraining

### Triggers

- Quality on matured labels falls below the guardrail (Straight-through processing rate) for two consecutive windows
- Feature drift (PSI above 0.2 on a top feature) together with a prediction-distribution shift
- A scheduled refresh (monthly) so the model never ages past its label horizon
- An upstream contract or semantic change in a source dataset

- **Data Maturity:** Train only on windows whose labels have matured (churn and expansion that show up 30 to 90 days later); treat the rest as censored and never as negatives.
- **Champion Challenger:** The challenger must match or beat the champion on a frozen time-forward holdout and on every protected slice, survive a shadow window, then pass canary guardrails before promotion.

## Lifecycle controls

| Area | Practice | Artifact | Gate |
|---|---|---|---|
| Experiment management | Track every run of Layout-aware document model with few-shot adapters per tenant (MLflow or equivalent): code commit, data snapshot id, hyperparameters, seeds, environment lock and metrics (Field-level accuracy); cap and log hyperparameter-search budgets. | Run record and reproducibility manifest | A promoted model can be rebuilt from its manifest within metric tolerance |
| Data and feature lifecycle | Validate inputs (Great Expectations, Deequ or pandera), define features such as Field confidence margin once in a feature registry, test offline-online consistency and version datasets with lakehouse snapshots. | Dataset snapshot id, feature definitions and validation report | No training on data that fails its contract |
| Model lifecycle management | Keep every version in a registry with model card, signed artifact, lineage and an approval workflow matched to the risk tier. | Registry version and model card | Approvals for tier "medium" are complete |
| ML CI/CD and continuous training | CI runs transform unit tests, contract tests and a training smoke test on synthetic data; CD builds, scans and signs the image; CT retrains on schedule or trigger and runs automated evaluation and promotion gates. | Pipeline run with evaluation report | Challenger beats champion on the frozen holdout and on every protected slice |
| Deployment and release management | Containerise (Docker), deploy on Kubernetes with document AI; use blue-green for the serving plane and shadow then canary (1%, 5%, 25%, 100%) for models. | Release record with canary results | p99, error rate and cost per 1,000 decisions stay within budget through the canary |
| Monitoring and observability | Track data drift, feature drift, prediction drift and, once labels mature, concept drift and model quality per slice, together with latency, throughput and cost. | Dashboards, alerts and SLO definitions | Alerts and owners exist before launch; drift without a quality drop opens an investigation, not a retrain |
| Retraining and rollback | Retrain on matured labels only (labels here: churn and expansion that show up 30 to 90 days later); run champion/challenger evaluation; keep the previous champion warm; retire models with no traffic. | Retrain decision record | Rollback to the previous champion is one step and rehearsed each quarter |
| Infrastructure and platform operations | Terraform for infrastructure, secrets in a vault, environment promotion dev → staging → production, and autoscaling on queue depth for 6 GPUs (L4/L40S class) with utilisation targets and a tested disaster-recovery path. | IaC repository and capacity plan | Environments are reproducible from code and failover is exercised |
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

6 GPUs (L4/L40S class) provisioned for 94 req/s (19.5% planned utilisation at peak). Autoscale on queue depth and queue wait, load-test at 1.2× provisioned before peak seasons, and re-run the sizing calculator with real traffic each quarter.

## Unit costs (modelled)

| Unit | Value | How |
|---|---|---|
| Cost per request | $0.00058 | Monthly run cost ÷ monthly decisions (modelled; on-demand list prices) |
| Cost per 1,000 decisions | $0.581 | Published in the capacity table and re-run live in the sizing calculator |
| Modelled monthly run cost at 10M users | $15.7K | Compute + platform overhead + cache and bus + storage |
| Infrastructure cost per daily active user per month | $0.0052 | Monthly run cost ÷ daily active users |

## Game-day log

| Date | Scenario (RB-xx) | What happened | Time to detect | Time to recover | Actions |
|---|---|---|---|---|---|
| | | | | | |
