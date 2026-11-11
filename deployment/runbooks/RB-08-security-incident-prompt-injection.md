# Operational Runbook RB-08: Security Incident & Prompt Injection Defense

**Runbook Code:** `RB-08-SECURITY-INJECTION`  
**Severity:** `P1` (Security Breach / Potential Data Exfiltration)  
**Primary Alert:** `PromptInjectionClassifierAlert` OR `SuspiciousToolCallPatternDetected`  
**Target MTTR:** < 5 minutes to isolate attacker and revoke session  
**Accountable Roles:** Security Engineer (Primary On-Call), AI Engineer  

---

## 1. Trigger Conditions & Detection
* **Alert Signal:**
  - High confidence score from pre-LLM Prompt Guard classifier (`injection_score > 0.85`).
  - Agent attempted to execute unauthorized system command or read restricted environment files.
  - User session repeatedly probed system prompts with delimiter injection sequences.

---

## 2. Immediate Containment & Mitigation (< 5 Minutes)

### Step 1: Terminate & Revoke Attacker Session
```bash
# Revoke attacker OAuth2 token and block IP in Envoy / WAF
curl -X POST "http://auth.internal/v1/sessions/revoke" \
  -H "Authorization: Bearer $SEC_KEY" \
  -d '{"user_id": "usr_attacker", "reason": "PROMPT_INJECTION_EXPLOIT"}'

# Block origin IP at Cloudflare / AWS WAF
aws wafv2 update-ip-set --name "brainsiphon-blocked-ips" --addresses "198.51.100.42/32"
```

### Step 2: Quarantine Agent Context Memory
If the user manipulated agent conversational memory:
```bash
# Flush session memory in Redis
redis-cli -h redis-cluster.internal DEL "agent_session:usr_attacker"
```

### Step 3: Forensic Audit of Tool Execution Ledger
Inspect all tools executed during the malicious session:
```sql
SELECT execution_id, tool_name, parameters, executed_at, response_code
FROM agent_tool_audit_log
WHERE user_id = 'usr_attacker'
ORDER BY executed_at DESC;
```
Verify whether any sensitive customer data was returned in tool response payloads.

