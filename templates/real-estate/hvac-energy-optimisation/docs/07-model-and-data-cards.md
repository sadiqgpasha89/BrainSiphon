# HVAC Energy Optimisation: model card and data card

> Generated from the blueprint `real-estate/hvac-energy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** HVAC Energy Optimisation · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed schedules with setpoints, because buildings use them.
- **Production model:** Model-predictive control with a learned thermal model and a safe RL layer inside bounds.
- **Intended use:** Control heating and cooling setpoints to cut energy use while keeping comfort within limits.
- **Out of scope:** - Building name: A label that does not carry thermal behaviour.<br>- Valve ID: An identifier for equipment with no information on state.<br>- Sensor brand: Drift characteristics may differ but the brand name itself does not help.
- **Primary metrics:** - Energy saved in simulation<br>- Comfort violations
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Sensor fault<br>- Heatwave<br>- Occupancy surge
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
- **Purpose:** Control heating and cooling setpoints to cut energy use while keeping comfort within limits.
- **Label:** For "HVAC Energy Optimisation": Control heating and cooling setpoints to cut energy use while keeping comfort within limits. No reference kit models this label, so define it exactly as in M1. Design around this trap first: A simulator that does not match the real building gives gains that vanish on site.
- **Sources:** - **Source:** Zone temperature inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: sensors are noisy and can be placed badly.<br>- **Source:** Weather forecast inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: forecasts have errors, so use ranges.<br>- **Source:** Occupancy forecast inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: data are aggregate and not personal.<br>- **Source:** Energy price inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: tariffs change, so load them from a table.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - A simulator that does not match the real building gives gains that vanish on site<br>- A mild test season hides performance in extremes
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
