# Operational Runbook RB-07: Covariate & Concept Drift Retraining Pipeline

**Runbook Code:** `RB-07-DRIFT-RETRAIN`  
**Severity:** `P3` (Proactive Operational Maintenance)  
**Primary Alert:** `FeatureCovariateShiftWarning` (Wasserstein distance or KS test p-val < 0.01)  
**Target MTTR:** < 24 hours to train, evaluate, and shadow-deploy challenger  
**Accountable Roles:** MLOps Engineer, Data Scientist  

---

## 1. Trigger Conditions & Detection
* **Daily Telemetry Assertion:**
  ```promql
  feature_drift_ks_stat{feature=~".*"} > 0.15
  OR
  wasserstein_distance_daily{feature=~".*"} > 0.20
  ```
* **Symptoms:**
  - Distribution shift on input features due to macroeconomic changes, holiday shopping, or software updates.
  - Model confidence distribution becomes bimodal or flattens.

---

## 2. Standard Retraining & Promotion Workflow

### Step 1: Trigger Automated Chronological Pipeline
```bash
# Execute automated Dagster / Airflow retraining DAG
dagster job execute -j retrain_drift_pipeline \
  --config-json '{"lookback_days": 60, "min_eval_pr_auc": 0.88}'
```

### Step 2: Automated Statistical Validation Gate
The pipeline automatically asserts:
1. Leakage-free chronological split across entity IDs.
2. Calibration curve Brier score ≤ 0.08.
3. PR-AUC and Recall at 0.5% FPR strictly beats current Champion model.

### Step 3: Canary Promotion & Shadow Evaluation
Deploy new model artifact to 5% shadow traffic:
```bash
kubectl apply -f deployment/kubernetes/overlays/production/canary-5pct.yaml
```
Monitor shadow parity for 48 hours before automated cutover.

