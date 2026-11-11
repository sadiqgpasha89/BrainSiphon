# Standard Client Discovery Questionnaire (AI/ML & Agent Systems)

**Document Code:** `BS-TMPL-SCOPE-01`  
**Phase:** Phase 0 — Scope & Discovery (Steps 0.1 – 0.4)  
**Target Roles:** Lead Business Analyst, Solution Architect, Delivery Lead  
**Stakeholder Audience:** Executive Sponsor, Product Owner, Domain Expert, Operations Lead  

---

## 1. Executive & Business Context
1. **Strategic Problem Definition:** What specific business problem is this solution solving, and why is existing software/logic failing to solve it?
2. **Current Workflow (AS-IS):** How is this decision made today (manual human operators, heuristic rules engine, scheduled SQL query)?
3. **Decision Volume & Cadence:** How many decisions are made per day/second? Is it 24/7 continuous, business hours only, or batch periodic?
4. **Target Business Metric (North Star):** What is the exact primary business metric this project will move (e.g., net fraud loss bps, customer churn %, inventory holding cost $)?
5. **Baseline Performance:** What is the measured numerical value of that North Star metric over the last 90 days?
6. **Financial Target:** What is the expected net dollar value or percentage improvement over the baseline within the first 6 months of production deployment?

## 2. Decision Mechanics & Operating Point
7. **Decision Ownership:** Who is the single human being or role ultimately accountable for the business decision (Product Owner, Underwriting Head, Risk Manager)?
8. **Action Taken on Decision:** Exactly what automated or human action is triggered by the system's output (e.g., decline transaction, dispatch technician, send SMS, highlight text)?
9. **Cost of False Positives (Type I Error):** What happens when the system predicts an event that did not occur (e.g., legitimate user declined, false alarm alert fatigue, unnecessary biopsy)? Quantify in dollars and customer friction.
10. **Cost of False Negatives (Type II Error):** What happens when the system fails to predict an event (e.g., fraudulent charge cleared, machine breaks down, sepsis missed)? Quantify in financial loss or liability.
11. **Operating Thresholds:** Is the business willing to accept a known false positive rate (e.g., 0.5%) to achieve target recall (e.g., 90%)?
12. **Reversibility of Action:** Can an automated action be reversed after the fact? If so, within what time window (seconds, minutes, days)?

## 3. Data Discovery & Historical Evidence
13. **Data Sources of Record:** What are the exact upstream systems of record (PostgreSQL, SAP ERP, Salesforce, Kafka topic, S3 data lake)?
14. **Historical Volume & Depth:** How many months or years of historical data are accessible in the lakehouse/warehouse?
15. **Target Label Definition:** How is the ground truth label created (user chargeback notification, doctor confirmation, customer cancellation)?
16. **Label Latency & Maturity:** How long after the event does the true label mature (e.g., fraud takes 60–90 days for chargebacks; churn takes 30 days)?
17. **Data Quality & Null Rates:** Are key join keys and timestamp columns consistently populated? What is the estimated missingness rate?
18. **Data Leakage Vectors:** Are features present in historical tables that were not actually known at the exact millisecond of the decision?

## 4. Technical Envelopes & Latency SLAs
19. **End-to-End Latency Budget:** What is the maximum allowable round-trip latency from request arrival to decision response (e.g., sub-10ms, sub-100ms, sub-2s, or batch)?
20. **Network & Calling Environment:** Will the caller invoke via synchronous REST, gRPC, event stream (Kafka), or queue?
21. **Peak Throughput (RPS):** What is the expected sustained RPS, peak RPS, and burst multiplier?
22. **Availability Expectation:** Is 99.9% (8.7 hours downtime/year) acceptable, or is 99.99% required?
23. **Graceful Degradation:** When the ML model or agent times out or crashes, what fallback heuristic or rule MUST execute to preserve user experience?

## 5. Security, Privacy & Regulatory Compliance
24. **Data Classification:** Does the data contain PII (Personally Identifiable Information), PHI (Protected Health Information), cardholder data (PCI-DSS), or proprietary intellectual property?
25. **Jurisdiction & Residency Constraints:** Where are the data subjects located? Does data residency law (GDPR, DPDP India, HIPAA, CCPA) pin data to a specific cloud region?
26. **Audit & Traceability Requirements:** Is the organization legally required to explain individual decisions to a regulator or customer upon demand?
27. **Model Governance & Explainability:** Are black-box models permitted, or are interpretable models (TreeSHAP, GAMs, Logistic Regression) mandatory?
28. **Human Oversight Tier:** Is Human-in-the-Loop (HITL) review required for high-stakes or uncertain predictions?

## 6. Organizational, Integration & Delivery Readiness
29. **Deployment Target:** Where will the production system run (AWS EKS, GCP Cloud Run, Azure AKS, on-premises Kubernetes)?
30. **Enterprise Identity & Access:** How will client services authenticate (OAuth2/OIDC, mTLS, AWS IAM Workload Identity)?
31. **Existing ML/Data Stack:** Does the organization already run a feature store (Feast), model registry (MLflow), or workflow orchestrator (Airflow/Dagster)?
32. **On-Call & Support Team:** Which engineering team will hold the pager for this service after go-live?
33. **Approval Sign-off Chains:** Who must sign off on the Gate 0 discovery charter before any engineering sprint commences?

