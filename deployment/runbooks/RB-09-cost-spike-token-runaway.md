# Operational Runbook RB-09: Cost Spike & Token Runaway Circuit Breaker

**Runbook Code:** `RB-09-COST-SPIKE`  
**Severity:** `P2` / `P1` if hourly run rate exceeds $500/hr  
**Primary Alert:** `LLMBudgetRateSpike` (Token consumption rate > 300% of baseline)  
**Target MTTR:** < 5 minutes to throttle runaway loops  
**Accountable Roles:** MLOps Engineer, Finance Lead  

---

## 1. Trigger Conditions & Detection
* **Prometheus Alert Trigger:**
  ```promql
  sum(rate(llm_gateway_token_usage_total[10m])) * 3600 > 5000000  # > 5M tokens/hr
  OR
  daily_estimated_cloud_cost_dollars > 2500
  ```
* **Symptoms:**
  - Agent caught in recursive thought loops or un-converging tool calls.
  - Autoscaler spawned 50+ GPU/CPU nodes due to traffic flood.

---

## 2. Immediate Mitigation (< 5 Minutes)

### Step 1: Engage Global Token Circuit Breaker
```bash
# Enable global rate limiting clamp on LLM Gateway
curl -X POST "http://llm-gateway.internal:8080/v1/admin/throttle" \
  -d '{"max_rpm": 200, "max_tokens_per_request": 1024}'
```

### Step 2: Terminate Recursive Agent Execution Loops
```bash
# Terminate long-running agent loops exceeding step threshold (> 15 steps)
python3 -m src.tools.kill_runaway_agents --max-steps 15
```

### Step 3: Enforce Aggressive Semantic Response Caching
```bash
# Route 100% of read requests through semantic cache (similarity threshold dropped to 0.82)
curl -X POST "http://llm-gateway.internal:8080/v1/cache/policy" -d '{"min_similarity": 0.82}'
```

