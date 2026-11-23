# Public Health Signal Detection: model card and data card

> Generated from the blueprint `public-sector/public-health-signal-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Health Signal Detection · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Weekly counts compared with thresholds and epidemiologist review, because it is the standard surveillance.
- **Production model:** A multi-source detection with reporting-lag correction, spatial clustering and a ranked alert list with context for epidemiologists.
- **Intended use:** Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking.
- **Out of scope:** - Facility name: an identifier.<br>- Clinician name: irrelevant.<br>- Report format: an artefact.
- **Primary metrics:** - Detection delay on past outbreaks<br>- False alert rate<br>- Recall of confirmed events
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Reporting change<br>- Outbreak in a small area<br>- Holiday effects
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including people with complex or unusual circumstances, small language communities, rural areas and new programme rules; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking.
- **Label:** For "Public Health Signal Detection": Detect early rises in illness from aggregated syndromic, wastewater and lab data so public health teams investigate sooner, without individual-level tracking. The reference kit's label: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Design around this trap first: Individual-level tracking.
- **Sources:** - **Source:** Syndromic counts inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: aggregated.<br>- **Source:** Wastewater concentration inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from labs.<br>- **Source:** Lab positivity inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from labs.<br>- **Source:** Reporting lag and holidays inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the calendar.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Individual-level tracking<br>- Raw count thresholds<br>- Public alarms from raw alerts
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
