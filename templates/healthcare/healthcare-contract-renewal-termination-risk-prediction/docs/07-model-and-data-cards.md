# Healthcare Contract Renewal & Termination Risk Prediction: model card and data card

> Generated from the blueprint `healthcare/healthcare-contract-renewal-termination-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Renewal & Termination Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A report of contracts expiring in the next 180 days.
- **Production model:** A rule-based notice calendar with a discrete-time survival and gradient-boosted model that scores the urgency and likelihood of a contentious or at-risk renewal, with evidence gap detection and a recommended start date.
- **Intended use:** Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately.
- **Out of scope:** - Contract title text: not risk.<br>- Account manager identity: not a driver.<br>- Signing date: explained by dates.
- **Primary metrics:** - Concordance index and time-dependent AUC for at-risk renewals at 90 and 180 days<br>- Notice-date rule accuracy<br>- Precision at the review capacity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Auto-renewal clause<br>- Contract merged or novated<br>- Amendment extends the term<br>- Mass expiry date
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
- **Purpose:** Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately.
- **Label:** For "Healthcare Contract Renewal & Termination Risk Prediction": Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Predicting dates that the contract states.
- **Sources:** - **Source:** Days to notice deadline minus review lead time inputs<br>**Owner:** Procurement<br>**System Of Record:** Contract management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: rule-computed.<br>- **Source:** Spend and criticality inputs<br>**Owner:** Contract management<br>**System Of Record:** Procurement and spend system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: verified records.<br>- **Source:** Performance and dispute history inputs<br>**Owner:** Legal<br>**System Of Record:** Supplier performance records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.<br>- **Source:** Alternative availability inputs<br>**Owner:** Finance<br>**System Of Record:** Obligation register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: qualification tables.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Predicting dates that the contract states<br>- Treating open contracts as renewed<br>- Alerting only at the deadline
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
