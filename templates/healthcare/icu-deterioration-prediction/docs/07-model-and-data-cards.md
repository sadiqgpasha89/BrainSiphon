# ICU & Ward Deterioration Prediction: model card and data card

> Generated from the blueprint `healthcare/icu-deterioration-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ICU & Ward Deterioration Prediction · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** NEWS2 score thresholds.
- **Production model:** Transformer over irregular multivariate time series with time-embeddings, calibrated across horizons and units.
- **Intended use:** Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early.
- **Out of scope:** - Total length of stay so far: proxies for severity but biases late.<br>- Bed number: location artefact.
- **Primary metrics:** - AUROC and AUPRC by horizon<br>- Calibration slope by unit
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Sensor disconnects during bathing<br>- Care-limit order changes
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
- **Purpose:** Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early.
- **Label:** For "ICU & Ward Deterioration Prediction": Predict cardiac arrest, ICU transfer or death within 12 hours for ward patients so rapid-response teams can intervene early. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Retrospective labels include interventions caused by model-driven alerts.
- **Sources:** - **Source:** Vital-sign trend z-scores inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: baseline excludes the prediction window.<br>- **Source:** Oxygen support escalation inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory, radiology and PACS systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: charted times.<br>- **Source:** Nurse concern flag inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: present only if recorded before event.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Retrospective labels include interventions caused by model-driven alerts<br>- Leakage via future-charted vitals
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
