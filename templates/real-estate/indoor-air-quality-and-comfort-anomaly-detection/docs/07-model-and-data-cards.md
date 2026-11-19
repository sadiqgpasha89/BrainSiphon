# Indoor Air Quality & Comfort Anomaly Detection: model card and data card

> Generated from the blueprint `real-estate/indoor-air-quality-and-comfort-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Indoor Air Quality & Comfort Anomaly Detection · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed limit alarms, because standards define them.
- **Production model:** Occupancy-conditioned anomaly detection with sensor health checks and a work-order link.
- **Intended use:** Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues.
- **Out of scope:** - Room name: A label that carries no information on air quality.<br>- Sensor ID: A device label that does not describe conditions.<br>- Floor: Floor number has weak relation once the ventilation system is known.
- **Primary metrics:** - Event recall<br>- False alarms
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Sensor drift<br>- Events<br>- Outdoor smoke
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
- **Purpose:** Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues.
- **Label:** For "Indoor Air Quality & Comfort Anomaly Detection": Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Few labelled events, so recall is poorly estimated.
- **Sources:** - **Source:** CO2 vs occupancy inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: occupancy counts are noisy, so smooth them.<br>- **Source:** Humidity drift inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: seasonal effects are strong, so compare with the same season.<br>- **Source:** Particulate spike inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: outdoor pollution enters, so compare with outside.<br>- **Source:** Temperature gradient inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: sensor placement bias affects it.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Few labelled events, so recall is poorly estimated<br>- Clean data from the first months of a deployment hides later drift and faults
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
