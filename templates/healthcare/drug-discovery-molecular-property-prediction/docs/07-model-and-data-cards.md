# Molecular Property Prediction for Drug Discovery: model card and data card

> Generated from the blueprint `healthcare/drug-discovery-molecular-property-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Molecular Property Prediction for Drug Discovery · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Random forest on ECFP fingerprints.
- **Production model:** Multitask GNN (D-MPNN) with pretraining, ensembling for uncertainty and active-learning loop selecting compounds to test.
- **Intended use:** Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles.
- **Out of scope:** - Molecule ID: arbitrary.<br>- Vendor of compound: batch effect.
- **Primary metrics:** - Scaffold-split RMSE and AUROC<br>- Uncertainty calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Out-of-domain scaffold<br>- Assay protocol change
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
- **Purpose:** Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles.
- **Label:** For "Molecular Property Prediction for Drug Discovery": Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Random split leakage.
- **Sources:** - **Source:** Pretrained molecular graph embedding inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: check overlap with test scaffolds.<br>- **Source:** Physicochemical descriptors inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory, radiology and PACS systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calculation tool version.<br>- **Source:** Assay noise estimate inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use for weighting.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Random split leakage<br>- Averaging across assays with different noise
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
