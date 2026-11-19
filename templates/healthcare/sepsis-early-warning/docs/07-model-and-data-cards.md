# Sepsis Early-Warning System: model card and data card

> Generated from the blueprint `healthcare/sepsis-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sepsis Early-Warning System · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Modified early warning score with fixed thresholds.
- **Production model:** Gradient-boosted model on irregularly sampled features with a GRU-D sequence branch, per-unit thresholds calibrated for alert burden.
- **Intended use:** Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it.
- **Out of scope:** - Admission diagnosis text: it encodes the admitting clinician's suspicion, which already knows the label, so the model would look good by repeating what a human thought.<br>- Antibiotic orders as input: an order placed after suspicion leaks the label and would make the system useless in the exact case it exists for.<br>- Length of stay so far: longer stays correlate with sepsis only because sicker patients stay longer, and it would make the model drift as discharge practices change.<br>- Optimising AUROC and shipping whatever threshold falls out: late alerts carry no clinical value yet inflate AUROC, and the threshold is the product.
- **Primary metrics:** - Lead time at 0.5 alerts per 100 patient-days<br>- Positive predictive value at fixed sensitivity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - New lab analyser changes units<br>- Alert fatigue after threshold change<br>- Patient transfers between units<br>- Sensor dropout<br>- Early antibiotics after an alert prevent septic shock<br>- Alert acknowledged and then the patient worsens
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it.
- **Label:** onset_hour is the adjudicated Sepsis-3 onset. The learning label y_next6h is 1 for the 6 hours strictly before onset and 0 otherwise; hours at or after onset are censored and never used, because a model that scores a patient already being treated learns nothing useful. Missing readings are real: null means nothing was charted that hour.
- **Sources:** - **Source:** Lactate and trend inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: use result time not draw time.<br>- **Source:** Missingness pattern inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory information system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: treat as signal only if the process is stable across sites.<br>- **Source:** SIRS and qSOFA drift inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: compute from charted times.<br>- **Source:** Vital-sign slope 3h inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Care-team and clinical identity directory<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: use charted times and carry values forward only from past readings.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Labels set after the intervention are partly caused by it<br>- Retrospective validation on a single hospital<br>- Counting clinician-order features as early warning
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
