# Provider Directory Accuracy Prediction: model card and data card

> Generated from the blueprint `healthcare/provider-directory-accuracy-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Directory Accuracy Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A rule that flags fields not verified in the last 90 days.
- **Production model:** Field-level gradient-boosted accuracy models fed by freshness, cross-source disagreement and activity features, an identity reconciliation layer for provider and location records and a capacity-aware outreach ranker.
- **Intended use:** Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely.
- **Out of scope:** - Provider popularity: does not relate to accuracy.<br>- Directory page traffic: reflects marketing.<br>- Provider age: protected and irrelevant.
- **Primary metrics:** - PR-AUC and precision at the outreach capacity by field<br>- Calibration by field<br>- Share of high-risk fields confirmed wrong in audit
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Provider moves practice<br>- Telehealth only provider<br>- Attestation received but wrong<br>- Directory feed outage
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
- **Purpose:** Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely.
- **Label:** For "Provider Directory Accuracy Prediction": Predict which provider directory fields such as location, specialty, affiliation, accepting-patients status and contact details are stale or inconsistent, so a health system can target attestation outreach where errors are most likely. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Training on records where change implies error.
- **Sources:** - **Source:** Field age since verification inputs<br>**Owner:** Provider data governance<br>**System Of Record:** Provider master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use verification events.<br>- **Source:** Cross-source disagreement inputs<br>**Owner:** Patient access<br>**System Of Record:** Provider directory and website feeds<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the snapshot at scoring.<br>- **Source:** Activity mismatch inputs<br>**Owner:** Marketing and digital<br>**System Of Record:** Scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use a lagged window.<br>- **Source:** Provider change propensity inputs<br>**Owner:** Provider data governance<br>**System Of Record:** Credentialing system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past data only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on records where change implies error<br>- Evaluating on the whole record instead of the field<br>- Ignoring feed outages
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
