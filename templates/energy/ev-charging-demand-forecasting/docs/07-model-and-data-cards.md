# EV Charging Demand Forecasting: model card and data card

> Generated from the blueprint `energy/ev-charging-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** EV Charging Demand Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Same-day-last-week demand per site, because it is the simple benchmark.
- **Production model:** A hierarchical forecaster with site and feeder aggregation, tariff and event covariates, quantile outputs and a growth model for new chargers.
- **Intended use:** Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge.
- **Out of scope:** - Driver name: irrelevant and private.<br>- Vehicle identifier: an identifier and private.<br>- Card number: an identifier.
- **Primary metrics:** - Weighted quantile loss<br>- Peak error<br>- Coverage by site type
- **Measured values (fill in):** ____________
- **Slices reported:** - Feeder, region and voltage level<br>- Weather regime and season<br>- Asset age, vendor and customer segment<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - New site<br>- Pricing change<br>- Outage
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare fault types, new feeder configurations, extreme weather events and newly connected distributed generation; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge.
- **Label:** For "EV Charging Demand Forecasting": Forecast charging demand by site and feeder so grid upgrades, tariffs and charger operations match when and where vehicles charge. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Individual trip tracking.
- **Sources:** - **Source:** Site type and location inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the register.<br>- **Source:** Day type and events inputs<br>**Owner:** Asset management<br>**System Of Record:** Meter data management and billing (CIS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from calendars.<br>- **Source:** Tariff and price signals inputs<br>**Owner:** Retail and customer operations<br>**System Of Record:** Asset management and GIS<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from tariffs.<br>- **Source:** Recent session volume inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from operator data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Individual trip tracking<br>- Average-based capacity planning<br>- Ignoring prices
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
