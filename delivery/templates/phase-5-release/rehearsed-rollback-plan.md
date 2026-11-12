# Rehearsed Rollback Plan & Rapid Recovery Guide

> **Document ID:** `BS-REL-ROL-01`  
> **Target System:** `[System Name / Blueprint ID]`  
> **Target Release:** `v[X.Y.Z]`  
> **Prior Stable Version:** `v[X.Y.Z-1]`  
> **Maximum Tolerable Rollback Time (RTO):** `< 60 seconds`  
> **Data Loss Tolerance (RPO):** `0 seconds (Zero committed data loss)`

---

## 1. Automated & Manual Abort Triggers

A rollback is **automatically triggered** if any of the following conditions persist for $> 60$ seconds during canary rollout:
1. **HTTP 5xx Error Rate:** $> 0.5\%$ of total request volume.
2. **Latency Breach:** P99 inference latency exceeds $30\text{ ms}$ (or $2\times$ agreed SLO).
3. **Model Prediction Collapse:** $\ge 15\%$ deviation in positive prediction rate compared to historical 7-day moving average.
4. **CrashLoopBackOff / OOMKilled:** Any model serving pod termination.
5. **Database Connection Saturation:** Connection pool utilization exceeds $85\%$.

*Manual Trigger Authority:* SRE Incident Commander, Lead ML Engineer, or Product Owner may order an immediate manual abort at any time without committee approval.

---

## 2. Immediate Rollback Commands (< 60s Execution)

### 2.1 Kubernetes / Helm Service Rollback
To instantly revert the stateless inference deployment to the previous stable release:

```bash
# Set target namespace
export NAMESPACE="brainsiphon-prod"
export RELEASE_NAME="ai-solution"

# 1. Rollback Helm release to immediate prior revision
helm rollback ${RELEASE_NAME} 0 -n ${NAMESPACE}

# 2. Alternatively, rollback deployment directly via kubectl
kubectl rollout undo deployment/${RELEASE_NAME} -n ${NAMESPACE}

# 3. Monitor rollout status until completion
kubectl rollout status deployment/${RELEASE_NAME} -n ${NAMESPACE} --timeout=45s

# 4. Verify healthy endpoints
kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/instance=${RELEASE_NAME}
```

### 2.2 Feature Flag Instant Kill-Switch
If the system uses LaunchDarkly or Redis-backed dynamic configuration to route traffic:

```bash
# Redis CLI instant kill-switch (divert 100% traffic to stable champion or fallback rules)
redis-cli -h redis-prod.internal -p 6379 SET "feature_flags:enable_challenger_model" "false"
redis-cli -h redis-prod.internal -p 6379 SET "feature_flags:active_model_version" "v1.2.0"

# Verify flag propagation
redis-cli -h redis-prod.internal -p 6379 GET "feature_flags:active_model_version"
```

### 2.3 Kafka Consumer Group Reset (Event Stream Reprocessing)
If an inference error resulted in poison pills or skipped streaming partitions:

```bash
# Stop current consumers
kubectl scale deployment/streaming-ingestion --replicas=0 -n ${NAMESPACE}

# Reset consumer group offset to pre-release timestamp
kafka-consumer-groups.sh \
  --bootstrap-server kafka-broker.internal:9092 \
  --group ai-inference-consumer-group \
  --topic raw-transaction-events \
  --reset-offsets \
  --to-datetime 2026-11-12T19:00:00.000 \
  --execute

# Restart consumers on stable version
kubectl scale deployment/streaming-ingestion --replicas=6 -n ${NAMESPACE}
```

---

## 3. Database & Schema Rollback Safeguards

> [!CAUTION]
> Never execute `DROP COLUMN` or irreversible table drops in a release migration. All migrations must adhere to the **Expand / Contract (Parallel Run)** pattern.

### Rollback Strategy for Database Migrations:
1. **Expand Phase (Pre-Release):**
   - New columns and tables added with default `NULL` or non-breaking constraints.
   - Both old version ($v1$) and new version ($v2$) can run concurrently against the database without syntax errors.
2. **If Rollback Occurs:**
   - Stateless pods revert to $v1$.
   - $v1$ simply ignores the newly added columns.
   - No backward database migration or table destruction is required during the live incident.
3. **Contract Phase (Post-Stabilization):**
   - Deprecated columns from previous versions are dropped only after $v2$ has been stable in production for at least 14 days.

---

## 4. Post-Rollback State Reconciliation & Data Recovery

1. **Dead-Letter Queue (DLQ) Drain & Replay:**
   - Inspect failed records captured in DLQ during the failure window:
     ```bash
     python scripts/inspect_dlq.py --bucket gs://ai-dlq-prod/failures/2026-11-12/
     ```
   - Replay clean events through the re-stabilized pipeline:
     ```bash
     python scripts/replay_dlq.py --target kafka-broker.internal:9092 --topic raw-transaction-events
     ```
2. **Customer / Partner Notification:**
   - Notify business stakeholders and API consumers within 15 minutes of rollback completion.
   - Inform whether any transactions require manual review or re-submission.
3. **Incident Freeze:**
   - Lock deployment pipelines (`git branch -d ...` / disable merge actions) until a Post-Incident Review (PIR) is completed.

