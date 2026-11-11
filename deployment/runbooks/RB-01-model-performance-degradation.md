# Operational Runbook RB-01: Model Performance Degradation & Accuracy Drift

**Runbook Code:** `RB-01-MODEL-DEGRADE`  
**Severity:** `P2` (Elevated Business Risk) / `P1` if financial loss exceeds $50k/day  
**Primary Alert:** `ModelAccuracyDriftDetected` (PR-AUC or Recall drop > 15% vs baseline)  
**Target MTTR:** < 30 minutes to rollback or shadow switch  
**Accountable Roles:** MLOps Engineer (Primary On-Call), Lead Data Scientist, Decision Owner  

---

## 1. Trigger Conditions & Detection (< 5 Minutes)
* **Prometheus Alert Trigger:**
  ```promql
  (model_pr_auc_sliding_7d - model_pr_auc_baseline) / model_pr_auc_baseline < -0.15
  OR
  population_stability_index_daily{feature="key_features"} > 0.25
  ```
* **Symptoms:**
  - Increase in false alarms or undetected fraud chargebacks.
  - Review queue intake suddenly surges > 2x normal volume.
  - Distribution shift alert on key numerical features (e.g., amount, velocity).

---

## 2. Immediate Mitigation (< 15 Minutes)

### Step 1: Verify Champion vs Challenger Telemetry
Check the live dual-scoring dashboard:
```bash
# Query the live model scoring discrepancy rate over the last 1 hour
curl -s "http://prometheus.internal:9090/api/v1/query?query=rate(model_score_discrepancy_total[1h])" | jq .
```

### Step 2: Activate Model Fallback / Rollback to Previous Stable Version
If the current model version (Champion) is degraded, execute an atomic rollback to the previous validated model artifact:
```bash
# Trigger automated rollback deployment in Kubernetes
kubectl set env deployment/inference-service ACTIVE_MODEL_VERSION="v1.1.8-lgbm" -n brainsiphon-prod

# Verify zero-downtime rollout completion
kubectl rollout status deployment/inference-service -n brainsiphon-prod
```

### Step 3: Enable Heuristic Safety Threshold Clamping (If Needed)
If a specific feature is corrupted upstream:
```bash
# Enable safe operating point clamping in Consul/Redis feature flags
curl -X POST "http://config.internal/v1/kv/brainsiphon/flags/strict_threshold_clamp" -d "true"
```

---

## 3. Diagnostic Workflow & Root Cause Analysis
1. **Check for Upstream Feature Skew:** Inspect Redis feature distributions against historical reference quantiles:
   ```bash
   python3 -m src.tools.drift_inspector --model-name card_fraud --lookback-hours 24
   ```
2. **Check for Concept Drift:** Inspect whether fraud attacker patterns have mutated (e.g., new merchant category codes or new device user-agents).
3. **Audit Label Delay Skew:** Verify if ground-truth labels arrived late or were misattributed by partner banks.

---

## 4. Permanent Recovery & Retraining
1. Launch an isolated backfill and retraining pipeline over the past 30 days of matured labels:
   ```bash
   dagster job execute -j retrain_challenger_pipeline --config retrain_cfg.yaml
   ```
2. Validate new challenger model against the leakage-free holdout test suite:
   ```bash
   pytest tests/model_evaluation/test_challenger_parity.py --min-pr-auc=0.88
   ```
3. Deploy new challenger into **Shadow Mode** (100% traffic mirrored, 0% customer effect) for 48 hours before promoting to production.

---

## 5. Post-Mortem & Preventative Actions
* Complete blameless post-mortem report within 72 hours.
* Add automated daily Population Stability Index (PSI) assertions to CI data quality gates.

