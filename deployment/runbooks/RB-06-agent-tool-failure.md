# Operational Runbook RB-06: Agent Tool Execution Failure & Idempotent Recovery

**Runbook Code:** `RB-06-AGENT-TOOL`  
**Severity:** `P2` / `P1` if agent executes disruptive containment actions  
**Primary Alert:** `AgentToolExecutionFailureSpike` (Tool execution failure rate > 15%)  
**Target MTTR:** < 10 minutes to contain and isolate failing tool  
**Accountable Roles:** AI Engineer (Primary On-Call), Security Engineer  

---

## 1. Trigger Conditions & Detection
* **Prometheus Alert Trigger:**
  ```promql
  sum(rate(agent_tool_invocations_total{status="failure"}[5m]))
  /
  sum(rate(agent_tool_invocations_total[5m])) > 0.15
  ```
* **Symptoms:**
  - SOC or Copilot Agent loops indefinitely attempting to retry a failing tool.
  - External API dependency (e.g. Jira, Crowdstrike, Slack) returns 502/503.
  - Partial execution leaves state inconsistent (e.g. ticket created but host not isolated).

---

## 2. Immediate Mitigation (< 10 Minutes)

### Step 1: Restrict Failing Tool in Agent Tool Registry
Disable the failing tool without taking down the entire agent:
```bash
# Disable specific tool dynamically in the Agent Control Plane
curl -X POST "http://agent-control-plane.internal:8080/v1/tools/disable" \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "isolate_host_endpoint", "reason": "CrowdStrike API 503 outage"}'
```

### Step 2: Enable Human Approval Interception for Retries
Enforce human-in-the-loop sign-off before the agent can retry any tool call:
```bash
curl -X POST "http://agent-control-plane.internal:8080/v1/policy/enforce-hitl" \
  -d '{"policy": "REQUIRE_HUMAN_CONFIRMATION_ALL_WRITES"}'
```

### Step 3: Execute Checkpoint Compensation Transaction
If the agent left an incomplete transaction:
```bash
# Replay agent execution trace and trigger compensating rollback action
python3 -m src.agent.compensate --trace-id "trace_849201" --action "revert_lockout"
```

