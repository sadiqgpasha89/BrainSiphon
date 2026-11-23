# Repository-Aware Code Completion: operations runbook

> Generated from the blueprint `devtools/repo-aware-code-completion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Repository-Aware Code Completion · **Domain:** devtools · **Latency tier:** sub-100ms · **Difficulty:** foundational

What the on-call engineer needs at 3 a.m.: objectives, alerts, the first steps for each known failure, how to roll back, and what each decision costs.

## Service level objectives

| Indicator | Objective | Window | Error budget |
|---|---|---|---|
| Share of valid requests answered inside the deadline | 99.95% over 30 days | 30 days | 21.6 minutes of unavailability per 30 days |
| End-to-end latency | p50 ≤ 28 ms, p95 ≤ 56 ms, p99 ≤ 80 ms | 30 days, per region | 1% of requests may exceed p99; burn-rate alerts at 2% in 1 hour |
| Input freshness at the consumer | p95 event-to-feature delay inside the contract | Rolling 1 day | Two breaches per week before the data owner is escalated |
| Model quality on matured labels | Retained accepted code within guardrail | Weekly, per slice | No slice below its floor for two consecutive windows |
| Decisions served from a degraded path | ≤ 1% of decisions below degradation level 1 | 30 days | 1% of decisions; a breach triggers a review of the ladder |
| Cost per 1,000 decisions | ≤ $5.53 | Monthly | 20% over the modelled cost before FinOps review |

## Telemetry to collect

| Layer | Signals |
|---|---|
| Model | Score and calibration distributions, drift (PSI/KS) per feature, slice metrics, challenger agreement |
| Data | Freshness, volume, schema and null-rate per contract, quarantine counts, late-event share |
| Infrastructure | GPUs (H100 class) utilisation, queue depth, memory, replica lag, event-bus consumer lag |
| Application | Per-stage latency (Editor context capture, Repository retrieval, Completion model), error rate by dependency, fallback level, decisions by action |

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

- **Deploy:** Signed image and model artifact promoted through GitOps; blue-green for the serving plane; shadow then canary (1%, 5%, 25%, 100%) with automatic halt on SLO or guardrail breach.
- **Rollback:** One-step revert to the previous registry version and serving revision, with backward-compatible schema migrations only; rollback is rehearsed every quarter.

**Rollback paths**

- Automatic rollback to the previous registry version on SLO or guardrail breach during canary
- Manual one-step rollback with the previous champion kept warm and signature-verified
- Feature-pipeline rollback by flipping the versioned namespace pointer back
- If the new version corrupted decisions, replay affected inputs through the previous version and correct downstream records from the ledger

## Runbook entries

### RB-01 Model endpoint becomes unavailable

- **Detect:** Health probes and error rate on Completion model; breaker state
- **Alert:** Page L2 when errors exceed 2% for 2 minutes (owner: ML platform on-call)
- **Mitigate:** Breaker opens and traffic drops to the in-process baseline (Language-server completion and snippets) at degradation level 2
- **Recover:** Restart or roll back the serving deployment, then close the breaker through half-open probing
- **Then learn:** Add a synthetic probe for the failure path and review autoscaling and readiness checks
- **Last drilled:** ________  **Result:** ________
### RB-02 Model quality deteriorates

- **Detect:** Matured-label metric (Retained accepted code), score-distribution and PSI drift, slice floors
- **Alert:** Ticket on drift, page on a guardrail breach (owner: DevTools AI model owner)
- **Mitigate:** Move thresholds to a conservative setting or promote the warm previous champion
- **Recover:** Train a challenger on the latest matured window and pass the promotion gates
- **Then learn:** Add the offline-online trap "Shown-suggestion metrics" to the regression suite
- **Last drilled:** ________  **Result:** ________
### RB-03 Feature store becomes unavailable

- **Detect:** Editor context capture p99 above its sub-budget, error rate and replica lag
- **Alert:** Page L2 when lookups time out for more than 1 minute (owner: ML platform on-call)
- **Mitigate:** Serve cached features stamped as stale and use the payload-only model; skip optional enrichment
- **Recover:** Fail over to the replica or restore the shard, then re-warm the cache
- **Then learn:** Rehearse the stale-feature path monthly and track the share of decisions made on stale data
- **Last drilled:** ________  **Result:** ________
### RB-04 Training pipeline fails

- **Detect:** Pipeline run state and the absence of a new registry version at the expected time
- **Alert:** Ticket to the pipeline owner; page if two consecutive runs fail (owner: DevTools AI model owner)
- **Mitigate:** Keep the current champion and freeze automatic promotion
- **Recover:** Re-run from the last good dataset snapshot after fixing the cause
- **Then learn:** Add a contract or resource test for the failing step
- **Last drilled:** ________  **Result:** ________
### RB-05 Data source stops sending records

- **Detect:** Volume and freshness anomaly on Cursor and file context inputs against the data contract
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

- **Detect:** GPUs (H100 class) utilisation, queue depth and queue wait against the remaining deadline
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
- **Recover:** Meet RTO 5 minutes (region evacuation), under 60 seconds for request routing; verify RPO Up to 60 seconds of feature state; exact counters have a single writer per key; fail back after reconciliation
- **Then learn:** Run quarterly game days and record measured RTO and RPO
- **Last drilled:** ________  **Result:** ________

## Degradation ladder

| Level | Trigger | Behaviour |
|---|---|---|
| 0 | All dependencies healthy | Full pipeline: fresh features, champion model, policy thresholds. |
| 1 | Optional enrichment or feature store p99 above its sub-budget | Serve with cached / stale features (age stamped into the decision) and skip optional enrichment. |
| 2 | Champion model breaker open or GPU/CPU saturation | Route to the distilled fallback model or last-known-good version from the registry. |
| 3 | Model tier unavailable | Deterministic rules / heuristics that are versioned, tested and owned by the business. |
| 4 | Whole serving plane unreachable from the caller | Caller-side default (fail-open or fail-closed chosen per risk appetite) + sampled post-hoc review queue. |

## Failure and retry behaviour

| Failure | Behaviour |
|---|---|
| Retrieval returns nothing relevant | Say so and offer a handoff; never generate an ungrounded answer to fill the gap. |
| Embedding or vector index unavailable | Fall back to keyword (BM25) retrieval with a reduced-confidence flag; ingestion retries from the queue. |
| Model provider rate-limited or timing out | Retry once with jitter, then route to the secondary model or return retrieved passages with citations and no free-form text. |
| A source document is updated or withdrawn | Re-ingest by content hash; retrieval filters on effective dates; answers already given keep the version they cited. |
| Citation does not support the claim | The verifier drops or rewrites the sentence; if grounding fails overall the response is withheld and escalated. |

## Security model

- **Surface:** Document access<br>**Control:** ACL filtering happens before the model sees any chunk; the filter uses the caller's groups, never the model's judgement.
- **Surface:** Prompt injection through documents<br>**Control:** Retrieved text is data in a delimited block; instructions inside it are ignored and flagged; tools are not exposed to this path.
- **Surface:** Sensitive data in prompts<br>**Control:** Redact or tokenise identifiers before the prompt is built; log hashes of questions, not raw text, where policy requires.
- **Surface:** Provider boundary<br>**Control:** Only approved providers and regions; contractual no-training and retention terms recorded; keys in a secrets manager, rotated.
- **Surface:** Cross-tenant leakage<br>**Control:** Tenant id is part of the index partition and the cache key; tested with planted cross-tenant canaries.

## Test scenarios for the running system

| Scenario | Kind | Assertion |
|---|---|---|
| Answer grounded in cited chunks | replay | On the golden question set, at least the agreed share of answers are grounded and every citation supports its claim. |
| ACL enforcement | safety | A user without access never receives text, citations or counts derived from a restricted document. |
| Planted prompt injection in a document | safety | The injected instruction is not followed and the document is flagged. |
| Out-of-scope question | unit | The assistant declines or hands off instead of answering from model memory. |
| Retrieval regression on re-index | replay | Recall@k and MRR on the labelled retrieval set do not drop after an embedding or chunking change. |
| Streaming under load | load | Time to first token stays inside budget at provisioned peak concurrency. |

## Retraining

### Triggers

- Quality on matured labels falls below the guardrail (Retained accepted code) for two consecutive windows
- Feature drift (PSI above 0.2 on a top feature) together with a prediction-distribution shift
- A scheduled refresh (monthly) so the model never ages past its label horizon
- An upstream contract or semantic change in a source dataset

- **Data Maturity:** Train only on windows whose labels have matured (production defects and security incidents that appear weeks or months after a change ships); treat the rest as censored and never as negatives.
- **Champion Challenger:** The challenger must match or beat the champion on a frozen time-forward holdout and on every protected slice, survive a shadow window, then pass canary guardrails before promotion.

## Lifecycle controls

| Area | Practice | Artifact | Gate |
|---|---|---|---|
| Experiment management | Track every run of A completion model with repository retrieval (MLflow or equivalent): code commit, data snapshot id, hyperparameters, seeds, environment lock and metrics (Offline acceptance on held-out code); cap and log hyperparameter-search budgets. | Run record and reproducibility manifest | A promoted model can be rebuilt from its manifest within metric tolerance |
| Data and feature lifecycle | Validate inputs (Great Expectations, Deequ or pandera), define features such as Cursor and file context once in a feature registry, test offline-online consistency and version datasets with lakehouse snapshots. | Dataset snapshot id, feature definitions and validation report | No training on data that fails its contract |
| Model lifecycle management | Keep every version in a registry with model card, signed artifact, lineage and an approval workflow matched to the risk tier. | Registry version and model card | Approvals for tier "medium" are complete |
| ML CI/CD and continuous training | CI runs transform unit tests, contract tests and a training smoke test on synthetic data; CD builds, scans and signs the image; CT retrains on schedule or trigger and runs automated evaluation and promotion gates. | Pipeline run with evaluation report | Challenger beats champion on the frozen holdout and on every protected slice |
| Deployment and release management | Containerise (Docker), deploy on Kubernetes with private LLM endpoint; use blue-green for the serving plane and shadow then canary (1%, 5%, 25%, 100%) for models. | Release record with canary results | p99, error rate and cost per 1,000 decisions stay within budget through the canary |
| Monitoring and observability | Track data drift, feature drift, prediction drift and, once labels mature, concept drift and model quality per slice, together with latency, throughput and cost. | Dashboards, alerts and SLO definitions | Alerts and owners exist before launch; drift without a quality drop opens an investigation, not a retrain |
| Retraining and rollback | Retrain on matured labels only (labels here: production defects and security incidents that appear weeks or months after a change ships); run champion/challenger evaluation; keep the previous champion warm; retire models with no traffic. | Retrain decision record | Rollback to the previous champion is one step and rehearsed each quarter |
| Infrastructure and platform operations | Terraform for infrastructure, secrets in a vault, environment promotion dev → staging → production, and autoscaling on queue depth for 65,625 GPUs (H100 class) with utilisation targets and a tested disaster-recovery path. | IaC repository and capacity plan | Environments are reproducible from code and failover is exercised |
| Operational governance | Maintain artifact lineage, access controls, audit logs, approvals, the model inventory and a release-evidence bundle per version. | Release evidence bundle | Every production version has a complete evidence bundle |

## Toolchain options

| Concern | Options |
|---|---|
| Experiment tracking and registry | MLflow, Weights & Biases, SageMaker or Vertex model registry |
| Pipelines and orchestration | Kubeflow Pipelines, Argo Workflows, Airflow, Flyte |
| Feature store and data validation | Feast, Tecton or a managed store; Great Expectations, Deequ, pandera |
| Serving and release | vLLM, TensorRT-LLM, KServe behind an LLM gateway |
| Monitoring | Prometheus and Grafana, OpenTelemetry, Evidently or WhyLabs for drift |
| Infrastructure and secrets | Terraform or Pulumi, Kubernetes, HashiCorp Vault or cloud KMS |

## Capacity statement (modelled)

65,625 GPUs (H100 class) provisioned for 156,250 req/s (100% planned utilisation at peak). Autoscale on queue depth and queue wait, load-test at 1.2× provisioned before peak seasons, and re-run the sizing calculator with real traffic each quarter.

## Unit costs (modelled)

| Unit | Value | How |
|---|---|---|
| Cost per repository, pull request or pipeline run | $0.0046 | Monthly run cost ÷ monthly decisions (modelled; on-demand list prices) |
| Cost per 1,000 decisions | $4.61 | Published in the capacity table and re-run live in the sizing calculator |
| Modelled monthly run cost at 10M users | $207.37M | Compute + platform overhead + cache and bus + storage |
| Infrastructure cost per daily active user per month | $69.12 | Monthly run cost ÷ daily active users |

## Game-day log

| Date | Scenario (RB-xx) | What happened | Time to detect | Time to recover | Actions |
|---|---|---|---|---|---|
| | | | | | |
