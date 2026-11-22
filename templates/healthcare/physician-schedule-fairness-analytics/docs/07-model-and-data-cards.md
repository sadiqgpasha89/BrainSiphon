# Physician Schedule Fairness Analytics: model card and data card

> Generated from the blueprint `healthcare/physician-schedule-fairness-analytics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Schedule Fairness Analytics · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A scheduler compares call counts in a spreadsheet when a complaint arrives.
- **Production model:** Defined burden metrics adjusted for FTE and approved exceptions, within-group dispersion and persistence analysis with small-group suppression, and a constrained what-if optimiser for leaders.
- **Intended use:** Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders.
- **Out of scope:** - Physician name: not a fairness factor.<br>- Schedule layout: format.<br>- Tenure: not defined burden.
- **Primary metrics:** - Metric reproducibility against a manual audit<br>- Disparity-detection agreement with leaders<br>- Privacy-rule compliance
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Very small group<br>- Approved exception added late<br>- Metric definition disputed<br>- Part-year physicians
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
- **Purpose:** Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders.
- **Label:** For "Physician Schedule Fairness Analytics": Measure how nights, weekends, holidays, call burden, undesirable shifts and workload are distributed across comparable physician groups, and show disparities and what-if adjustments to leaders. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Ranking individual physicians.
- **Sources:** - **Source:** Burden index inputs<br>**Owner:** Medical group leadership<br>**System Of Record:** Scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: actual schedule.<br>- **Source:** Dispersion within group inputs<br>**Owner:** Physician scheduling office<br>**System Of Record:** Physician roster and group membership<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: closed cycles.<br>- **Source:** Exception-adjusted share inputs<br>**Owner:** Physician wellbeing lead<br>**System Of Record:** Approved exceptions register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: exceptions register.<br>- **Source:** Persistence across cycles inputs<br>**Owner:** HR<br>**System Of Record:** Workload definitions<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: several cycles.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Ranking individual physicians<br>- Comparing unlike groups<br>- Rebalancing without leader approval
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
