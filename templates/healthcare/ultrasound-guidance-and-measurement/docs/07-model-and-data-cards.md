# Ultrasound Guidance & Auto-Measurement: model card and data card

> Generated from the blueprint `healthcare/ultrasound-guidance-and-measurement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ultrasound Guidance & Auto-Measurement · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Sonographer manual measurements.
- **Production model:** Lightweight CNN/transformer with temporal tracking for view classification and landmark regression, distilled to mobile NPU.
- **Intended use:** Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans.
- **Out of scope:** - Gain and depth settings: acquisition variables.<br>- Probe vendor: domain.
- **Primary metrics:** - Measurement error vs expert<br>- View classification accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Patient body habitus reduces image quality<br>- Probe vendor domain shift
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
- **Purpose:** Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans.
- **Label:** For "Ultrasound Guidance & Auto-Measurement": Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Training on expert-acquired scans only.
- **Sources:** - **Source:** View-quality score inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibrated.<br>- **Source:** Anatomical landmark heatmaps inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory, radiology and PACS systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: landmark annotation.<br>- **Source:** Cardiac phase detection inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: tracking.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on expert-acquired scans only<br>- Evaluating after view selection
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
