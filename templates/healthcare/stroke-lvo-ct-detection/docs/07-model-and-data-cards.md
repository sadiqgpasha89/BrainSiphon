# Stroke Large-Vessel Occlusion CT Detection: model card and data card

> Generated from the blueprint `healthcare/stroke-lvo-ct-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Stroke Large-Vessel Occlusion CT Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Radiologist read with phone call.
- **Production model:** 3D CNN for LVO detection on CTA with automated vessel tracking, push alerts to stroke teams and confirmation by radiologist.
- **Intended use:** Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy.
- **Out of scope:** - Patient position: variable.<br>- Scanner site: domain.
- **Primary metrics:** - Sensitivity and specificity for LVO<br>- Time to alert
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Motion artefacts<br>- Network outage
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
- **Purpose:** Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy.
- **Label:** For "Stroke Large-Vessel Occlusion CT Detection": Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Retrospective cohorts with selected cases.
- **Sources:** - **Source:** Vessel density asymmetry inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: registration quality.<br>- **Source:** Collateral score inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory, radiology and PACS systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: phase timing.<br>- **Source:** Clot burden estimate inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: annotation.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Retrospective cohorts with selected cases<br>- Latency measured without network delays
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
