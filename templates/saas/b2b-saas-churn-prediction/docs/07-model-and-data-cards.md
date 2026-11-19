# B2B SaaS Churn Prediction: model card and data card

> Generated from the blueprint `saas/b2b-saas-churn-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** B2B SaaS Churn Prediction · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rule-based health score from usage thresholds.
- **Production model:** Discrete-time survival GBDT on account-level features with champion-change detection and an uplift layer for CSM playbooks.
- **Intended use:** Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue.
- **Out of scope:** - Number of logins total: scale with account size.<br>- Company logo or industry text: weak.
- **Primary metrics:** - Time-dependent AUC and calibration<br>- Uplift on CSM-treated accounts
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Champion leaves the customer<br>- Price increase announced
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue.
- **Label:** For "B2B SaaS Churn Prediction": Predict account-level churn and contraction 90 days ahead and recommend the intervention that actually retains revenue. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Features computed after the renewal conversation started.
- **Sources:** - **Source:** Admin and champion activity inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: role mapping.<br>- **Source:** Seat utilisation trend inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: billing data as-of.<br>- **Source:** Support-ticket sentiment and escalations inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: matured tickets.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Features computed after the renewal conversation started<br>- Treating all churn as preventable
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
