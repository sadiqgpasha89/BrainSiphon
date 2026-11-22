# Clinical Quality Performance Anomaly Detection: model card and data card

> Generated from the blueprint `healthcare/clinical-quality-performance-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Quality Performance Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Control chart with fixed three-sigma limits.
- **Production model:** Multivariate and seasonal time-series anomaly detection on adjusted indicators with a data-quality gate in front, a data-versus-performance classifier behind it and an analyst triage view with baseline comparison.
- **Intended use:** Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating.
- **Out of scope:** - Single low-denominator month: noise.<br>- Unreviewed manual overrides: inconsistent.<br>- Weekend effects in monthly measures: seasonality.
- **Primary metrics:** - Detection recall and precision on seeded and adjudicated shifts at the alert budget<br>- Data-versus-performance classification accuracy<br>- Median time to detection
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Measure specification update<br>- Late-arriving data<br>- Seasonality shift<br>- Merged units
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
- **Purpose:** Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating.
- **Label:** For "Clinical Quality Performance Anomaly Detection": Detect unexpected changes in quality indicators across facilities, units, specialties and time, and tell analysts whether a change is more likely a data problem or a real performance shift before escalating. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Treating data defects as performance.
- **Sources:** - **Source:** Adjusted deviation from baseline inputs<br>**Owner:** Quality analytics<br>**System Of Record:** Quality and performance reporting system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: baseline fit on earlier periods.<br>- **Source:** Data completeness at cut-off inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Enterprise data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: at the cut-off.<br>- **Source:** Definition change flag inputs<br>**Owner:** Data engineering<br>**System Of Record:** Measure specification library<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: version tags.<br>- **Source:** Cross-unit coherence inputs<br>**Owner:** Quality and patient safety<br>**System Of Record:** Quality and performance reporting system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: same period.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating data defects as performance<br>- Tuning on seeded anomalies only<br>- Using fixed limits for seasonal measures
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
