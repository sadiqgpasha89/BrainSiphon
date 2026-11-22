# Healthcare Supplier Performance & Risk Scoring: model card and data card

> Generated from the blueprint `healthcare/healthcare-supplier-performance-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Supplier Performance & Risk Scoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Annual vendor scorecard from delivery and quality reports.
- **Production model:** Explainable gradient-boosted classification and trend forecasting per risk dimension combined with a rules-based criticality overlay and a scorecard that labels each input as an observed fact or an external signal.
- **Intended use:** Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals.
- **Out of scope:** - Supplier marketing material: not evidence.<br>- Social media volume: noisy.<br>- Account manager opinion: unsystematic.
- **Primary metrics:** - PR-AUC and precision at the review capacity by dimension<br>- Calibration of risk probabilities<br>- Lead time of correct risk flags before disruption
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Supplier merger<br>- Recall event<br>- Sparse history for a new supplier<br>- Licensed feed outage
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals.
- **Label:** For "Healthcare Supplier Performance & Risk Scoring": Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Mixing facts with unverified external signals.
- **Sources:** - **Source:** On-time-in-full rate trend inputs<br>**Owner:** Supply chain risk<br>**System Of Record:** Procurement and supplier management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: receipts as logged.<br>- **Source:** Quality incident rate inputs<br>**Owner:** Procurement<br>**System Of Record:** Receiving and inventory system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: incidents as recorded.<br>- **Source:** Single-source exposure inputs<br>**Owner:** Clinical value analysis<br>**System Of Record:** Quality and recall management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: item qualification tables.<br>- **Source:** External risk flags inputs<br>**Owner:** Materials management<br>**System Of Record:** Supplier master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: feed timestamps.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Mixing facts with unverified external signals<br>- Weighting by spend not criticality<br>- Evaluating without a time split
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
