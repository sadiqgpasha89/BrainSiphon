# Operational Runbook RB-04: LLM Provider Outage & Multi-Model Failover

**Runbook Code:** `RB-04-LLM-OUTAGE`  
**Severity:** `P1` (Total Service Impairment for Generative AI / RAG / Agents)  
**Primary Alert:** `LLMProviderErrorRateHigh` (HTTP 5xx rate > 10% or response timeout > 5s)  
**Target MTTR:** < 2 minutes (Automated Gateway Failover)  
**Accountable Roles:** AI Engineer (Primary On-Call), SRE Lead  

---

## 1. Trigger Conditions & Detection
* **Prometheus Alert Trigger:**
  ```promql
  sum(rate(llm_gateway_requests_total{status=~"5.."}[2m])) 
  / 
  sum(rate(llm_gateway_requests_total[2m])) > 0.10
  ```
* **Symptoms:**
  - Upstream LLM API returns 429 Rate Limit Exceeded or 503 Service Unavailable.
  - User-facing copilot / assistant displays spinning loader or generic error message.

---

## 2. Immediate Mitigation & Failover (< 2 Minutes)

### Step 1: Automated Gateway Multi-Provider Dynamic Routing
The LLM Gateway automatically activates the secondary fallback provider upon 3 consecutive 5xx errors:
```bash
# Verify current gateway active route
curl -s "http://llm-gateway.internal:8080/v1/routing/status" | jq .

# If automated failover failed, force manual switch to secondary provider (e.g. Anthropic / Azure OpenAI / Local vLLM)
curl -X POST "http://llm-gateway.internal:8080/v1/routing/switch" \
  -H "Content-Type: application/json" \
  -d '{"primary_provider": "azure-openai", "model": "gpt-4o-fallback"}'
```

### Step 2: Enable Semantic Cache Read-Only Mode
If all external providers are degraded:
```bash
# Force gateway into aggressive semantic caching mode (serve cached answers for similarity > 0.88)
curl -X POST "http://llm-gateway.internal:8080/v1/cache/mode" -d '{"mode": "AGGRESSIVE_SERVE_STALE"}'
```

### Step 3: Graceful Degradation to Extractive / Rule-Based Answers
For documentation assistants and search:
```bash
# Toggle UI to raw BM25 extractive mode with template message: "AI generation temporarily paused; showing top cited passages."
curl -X POST "http://config.internal/v1/kv/brainsiphon/flags/llm_extractive_fallback" -d "true"
```

