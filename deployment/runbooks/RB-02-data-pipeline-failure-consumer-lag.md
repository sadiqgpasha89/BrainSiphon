# Operational Runbook RB-02: Data Pipeline Failure & Streaming Consumer Lag

**Runbook Code:** `RB-02-DATA-LAG`  
**Severity:** `P2` / `P1` if consumer lag exceeds 5 minutes of real-time events  
**Primary Alert:** `KafkaConsumerGroupLagCritical` (> 10,000 unconsumed records or lag > 30s)  
**Target MTTR:** < 15 minutes to stabilize consumer lag  
**Accountable Roles:** Data Engineer (Primary On-Call), Platform Engineer  

---

## 1. Trigger Conditions & Detection (< 5 Minutes)
* **Prometheus Alert Trigger:**
  ```promql
  kafka_consumergroup_lag{topic="brainsiphon.events.v1.raw"} > 10000
  OR
  rate(kafka_consumergroup_current_offset[5m]) == 0
  ```
* **Symptoms:**
  - Feature store features in Redis are stale (freshness SLA breached).
  - Inference service reports missing streaming aggregates and falls back to cold baseline values.
  - Streaming pod logs display OutOfMemory (OOM) or deserialization exceptions.

---

## 2. Immediate Mitigation (< 15 Minutes)

### Step 1: Check Consumer Pod Status & Crash Loops
```bash
kubectl get pods -n brainsiphon-prod -l app=streaming-feature-extractor
kubectl logs -n brainsiphon-prod -l app=streaming-feature-extractor --tail=100
```

### Step 2: Scale Consumer Group Concurrency
If lag is caused by legitimate traffic volume spike:
```bash
# Scale consumer pods up to match partition count (e.g. 12 partitions)
kubectl scale deployment/streaming-feature-extractor --replicas=12 -n brainsiphon-prod

# Verify consumer rebalancing across partitions
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group streaming-feature-group
```

### Step 3: Poison Pill / Malformed Event Bypass to DLQ
If the consumer is crashing repeatedly on a poisoned record:
```bash
# Trigger DLQ bypass on the poison offset and skip forward 1 message
python3 -m src.tools.kafka_dlq_skipper --group streaming-feature-group --topic brainsiphon.events.v1.raw --skip-poison
```

---

## 3. Diagnostic Workflow & Recovery
1. **Inspect Dead-Letter Queue for Schema Errors:**
   ```bash
   kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic brainsiphon.dlq.v1.errors --max-messages 10 | jq .
   ```
2. **Reconcile Redis Feature State:**
   Re-run backfill reconciler to restore any missed entity aggregates:
   ```bash
   python3 -m src.tools.redis_reconciliation --window-minutes 60
   ```
3. **Verify Lag Recovery:**
   ```bash
   kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group streaming-feature-group | grep -v "LAG 0"
   ```

