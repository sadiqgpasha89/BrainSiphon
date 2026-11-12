# Model Card Specification

**Model Name:** `Real-Time Fraud Detection Challenger (LightGBM-Regularized)`  
**Model Version:** `v1.2.0-rc3`  
**Date:** `2026-11-12`  
**License:** `Internal Commercial / Proprietary`  
**Owner:** ML Engineering & Model Risk Governance  

---

## 1. Model Overview & Intended Use
* **Primary Task:** Binary classification of authorization events into `Genuine` (0) vs `Fraudulent` (1).
* **Target Audience:** Real-time authorization gateway (Card Issuer / Payment Service Provider).
* **Out-of-Scope Use:** Credit risk assessment, automated credit line reduction, marketing churn scoring.

## 2. Training Data & Label Maturity
* **Dataset Snapshot:** `s3://aiml-lakehouse/snapshots/fraud_training_2026q3_matured.parquet` (SHA-256 sealed).
* **Maturity Gap:** 21-day maturity window. Transactions from the last 21 days are strictly excluded from negatives to prevent training against un-reported chargebacks.
* **Class Imbalance:** 0.36% positive prevalence (720 positives / 200,000 authorisations). Handled via monotonic leaf constraints and focal loss weighting.

## 3. Performance Metrics & Operating Thresholds
* **Evaluation Protocol:** Time-split forward evaluation on held-out 30-day window.
* **PR-AUC:** `0.752` (Baseline Logistic Regression: `0.691`, lift: `+8.8%`).
* **Recall at Fixed 0.5% False-Positive Rate:** `76.4%` (Baseline: `74.1%`).
* **Operating Threshold:** `0.085` (calibrated probability threshold enforcing false-decline ceiling &le; 0.3%).

## 4. Subgroup Slice Analysis & Fairness
* **Merchant Category Slice:**
  * Grocery / Supermarkets: Recall `82.1%` @ 0.5% FPR
  * High-Risk Digital Goods / Gaming: Recall `71.4%` @ 0.5% FPR
  * Travel & Airlines: Recall `73.0%` @ 0.5% FPR
* **Device Cohort Slice:** New device (age &lt; 24h) recall `79.2%`; established device recall `75.1%`.

## 5. Explainability & Reason Codes
* **Method:** TreeSHAP (Tree Explainer) with top-3 negative and positive attribution drivers.
* **Reason Codes:** Every score above 0.085 emits ISO 8583 compatible reason codes (`velocity_1h_high`, `mule_device_fanout`, `merchant_risk_elevated`).

## 6. Caveats & Ethical Considerations
* **Adversarial Drift:** Criminal rings adapt velocity patterns. Weekly Kolmogorov-Smirnov (KS) drift monitoring required.
* **Human Oversight:** Ambiguous scores between `0.085` and `0.350` route to 3-D Secure step-up authentication or human fraud analyst review queue.

