# Office Space Utilisation from Sensors: model card and data card

> Generated from the blueprint `real-estate/office-space-utilisation-from-sensors` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Office Space Utilisation from Sensors · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Annual manual headcount, because it is cheap.
- **Production model:** Occupancy estimation from sensor fusion with gap filling and a recommendation engine for layouts.
- **Intended use:** Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts.
- **Out of scope:** - Sensor ID: A device label that carries no information on use.<br>- Floor colour: A physical attribute that does not affect occupancy.<br>- Badge number: A personal identifier that must not be used, for privacy.
- **Primary metrics:** - Count error<br>- Peak error
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Sensor failure<br>- Hybrid days<br>- Events
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts.
- **Label:** For "Office Space Utilisation from Sensors": Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: A short pilot period misses seasonal peaks and holidays.
- **Sources:** - **Source:** Peak occupancy inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: sensor errors create spikes, so remove impossible values.<br>- **Source:** Booked vs used inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: booking data are often incomplete.<br>- **Source:** Dwell time inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: sensors miss still people, so cross-check with a second source.<br>- **Source:** Day pattern inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: patterns shift with policies, so refresh it often.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - A short pilot period misses seasonal peaks and holidays<br>- Sensor bias, such as under-counting in doorways, makes the data look cleaner than the truth
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
