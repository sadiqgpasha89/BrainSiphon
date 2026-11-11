# Operational Runbook RB-03: Inference Latency Spike & P99 SLA Breach

**Runbook Code:** `RB-03-LATENCY-SPIKE`  
**Severity:** `P1` (Direct SLA Breach)  
**Primary Alert:** `InferenceLatencyP99Breach` (P99 > 15.0ms for > 2 consecutive minutes)  
**Target MTTR:** < 5 minutes to restore latency envelope  
**Accountable Roles:** Inference Engineer (Primary On-Call), SRE Lead  

---

## 1. Trigger Conditions & Detection (< 2 Minutes)
* **Prometheus Alert Trigger:**
  ```promql
  histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{endpoint="/v1/score"}[2m])) by (le)) > 0.015
  ```
* **Symptoms:**
  - Upstream caller begins seeing timeouts or client-side circuit breakers tripping.
  - CPU utilization on inference worker nodes spikes above 85%.
  - Redis connection pool wait queue builds up.

---

## 2. Immediate Mitigation (< 5 Minutes)

### Step 1: Emergency Autoscaling & Replica Boost
```bash
# Immediately scale inference pods to high-water mark
kubectl scale deployment/inference-service --replicas=30 -n brainsiphon-prod
```

### Step 2: Enable Adaptive Concurrency Load Shedding
If latency is caused by traffic spike exceeding cluster capacity:
```bash
# Enable shedding of low-priority / batch traffic
kubectl patch configmap/inference-config -n brainsiphon-prod -p '{"data":{"LOAD_SHEDDING_ENABLED":"true"}}'
```

### Step 3: Lower Redis Lookup Timeout Budget
If the latency spike is caused by Redis key-value lookups:
```bash
# Clamp Redis lookup timeout from 5ms to 2ms (forces fast fallback to cold features)
kubectl set env deployment/inference-service REDIS_TIMEOUT_MS="2" -n brainsiphon-prod
```

---

## 3. Root Cause Analysis
1. **Thread Pool Contention:** Check if synchronous blocking calls were accidentally introduced in FastAPI route handlers:
   ```bash
   kubectl logs -n brainsiphon-prod -l app=inference-service --tail=200 | grep -i "slow"
   ```
2. **Garbage Collection (GC) Pauses:** Inspect Python memory and GC pause telemetry:
   ```bash
   curl -s "http://prometheus.internal:9090/api/v1/query?query=python_gc_duration_seconds{app='inference-service'}" | jq .
   ```
3. **Database Connection Lock:** Check if the decision ledger write path is blocking the response:
   ```bash
   # Ensure decision ledger writes are purely asynchronous background tasks
   grep -rn "background_tasks" src/serving/
   ```

