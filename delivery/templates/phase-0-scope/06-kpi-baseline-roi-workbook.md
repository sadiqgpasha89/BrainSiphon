# Business KPI Baseline & Financial ROI Model Workbook

**Document Code:** `BS-TMPL-SCOPE-06`  
**Phase:** Phase 0 — Scope & Discovery (Step 0.7)  

---

## 1. Baseline Financial & Operational Metrics (Historical 90 Days)

| Parameter | Current Baseline | Source of Truth |
| :--- | :--- | :--- |
| **Gross Monthly Transaction Volume** | $150,000,000 | Core Ledger DB |
| **Monthly Decision Count** | 5,000,000 decisions | Gateway Access Logs |
| **Current Incident / Loss Rate** | 0.22% (22 bps = $330,000 / month) | Chargeback Records |
| **Manual Review Volume** | 3.5% of total volume (175,000 cases) | Case Management DB |
| **Cost per Human Review** | $2.50 per reviewed case ($437,500 / month) | Operations Cost Accounting |
| **Total Current Monthly Cost of Problem** | **$767,500 / month** ($9.21M annualized) | Finance Reports |

---

## 2. Target System Performance Assumptions

| Model Metric | Baseline | Target Model | Business Impact |
| :--- | :--- | :--- | :--- |
| **Detection Recall** | 62% (Rules) | 88% (ML Model) | Catches +$112,200/mo in prevented losses |
| **False Positive Rate (FPR)** | 8.2% | 0.45% | Drops false alarms by 94% |
| **Review Queue Intake** | 3.5% (175,000 cases) | 0.8% (40,000 cases) | Saves $337,500/mo in review labor |
| **Avg. Review Handling Time** | 4.2 minutes | 1.1 minutes (SHAP augmented) | Increases reviewer throughput 3.8x |

---

## 3. Financial Cost-Benefit Model (3-Year Horizon)

### A. Total Cost of Ownership (TCO)
* **Capitalized Engineering & Delivery:** $280,000 (Discovery, Build, Verification, Initial Launch)
* **Infrastructure Compute & Hosting:** $8,500 / month (AWS EKS, RDS PostgreSQL, Redis, Kafka)
* **Model Operations & Maintenance:** $12,000 / month (MLOps engineer allocation, data maintenance)
* **Total Year 1 Cost:** $280,000 + ($20,500 × 12) = **$526,000**
* **Total Annual Run Rate (Years 2 & 3):** **$246,000 / year**

### B. Gross Monthly Financial Value Generated
1. **Direct Prevented Losses:** +$112,200 / month
2. **Operations Labor Savings:** +$337,500 / month
3. **Customer Churn Prevention (reduced false declines):** +$45,000 / month
4. **Gross Monthly Benefit:** **+$494,700 / month** ($5.93M annualized)

### C. Return on Investment (ROI) Summary
* **Net Year 1 Benefit:** $5,936,400 − $526,000 = **+$5,410,400**
* **Payback Period:** **1.8 months post-launch**
* **Year 1 ROI:** **1,028%**

---

## 4. Sensitivity & Break-Even Analysis

| Scenario | Model Recall | False Positive Rate | Net Monthly Value | Payback Period |
| :--- | :--- | :--- | :--- | :--- |
| **Pessimistic (-20% Perf)** | 70% | 1.5% | +$265,000 / mo | 3.2 months |
| **Expected Case (Target)** | **88%** | **0.45%** | **+$494,700 / mo** | **1.8 months** |
| **Optimistic (+10% Perf)** | 93% | 0.25% | +$560,000 / mo | 1.4 months |
| **Break-Even Floor** | 45% | 4.0% | +$42,000 / mo | 8.1 months |

