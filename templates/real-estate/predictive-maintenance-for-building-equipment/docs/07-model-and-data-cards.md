# Predictive Maintenance for Building Equipment: model card and data card

> Generated from the blueprint `real-estate/predictive-maintenance-for-building-equipment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Maintenance for Building Equipment · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Calendar-based maintenance and alarm thresholds, because it is typical.
- **Production model:** Remaining-useful-life and anomaly models per equipment class with context features and a work-order integration.
- **Intended use:** Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns.
- **Out of scope:** - Equipment name: A label that differs by site and does not predict failure.<br>- Installer: Weakly related to wear once the model and age are known.<br>- Building colour: No physical link to equipment condition.
- **Primary metrics:** - Lead-time recall<br>- False alarm rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Sensor drift<br>- Mode change<br>- Few failures
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns.
- **Label:** For "Predictive Maintenance for Building Equipment": Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Maintenance resets the history, so a repaired machine looks as though it had no problem.
- **Sources:** - **Source:** Vibration trend inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: sensors loosen and drift, so calibrate per sensor.<br>- **Source:** Efficiency drift inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: weather changes the baseline, so normalise by load and temperature.<br>- **Source:** Runtime hours inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: logging gaps and meter replacements reset the counter.<br>- **Source:** Fault codes inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: alarms are noisy, so count only the codes linked to failures.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Maintenance resets the history, so a repaired machine looks as though it had no problem<br>- Few failures in the data make any evaluation unstable
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
