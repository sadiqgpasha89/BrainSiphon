# Metric Anomaly Detection: model card and data card

> Generated from the blueprint `it-ops/metric-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Metric Anomaly Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Static thresholds on key metrics, because they are the standard configuration.
- **Production model:** A per-series detector with seasonal baselines, multi-metric confirmation and release awareness that publishes alerts with context to the alert pipeline.
- **Intended use:** Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds.
- **Out of scope:** - Host name: an identifier.<br>- Metric unit label: an artefact.<br>- Dashboard folder: irrelevant.
- **Primary metrics:** - Detection of seeded anomalies<br>- False alert rate<br>- Time to detect
- **Measured values (fill in):** ____________
- **Slices reported:** - Service tier, region and technology stack<br>- Ticket category and priority<br>- Site, device type and business unit<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - New metric<br>- Planned event<br>- Gradual drift
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new services, rarely used systems, major incidents and remote or legacy sites; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds.
- **Label:** For "Metric Anomaly Detection": Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Fixed thresholds only.
- **Sources:** - **Source:** Deviation from seasonal baseline inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from time-series.<br>- **Source:** Rate of change inputs<br>**Owner:** Service management<br>**System Of Record:** Configuration management database<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from metrics.<br>- **Source:** Related metric movement inputs<br>**Owner:** Security operations<br>**System Of Record:** Monitoring, logging and cloud billing platforms<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the same service.<br>- **Source:** Deployment marker inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from change records.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Fixed thresholds only<br>- Alert count as success<br>- Ignoring release events
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
