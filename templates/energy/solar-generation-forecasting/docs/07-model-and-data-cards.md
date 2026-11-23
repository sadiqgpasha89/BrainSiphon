# Solar Generation Forecasting: model card and data card

> Generated from the blueprint `energy/solar-generation-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Solar Generation Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Clear-sky output scaled by the day-ahead cloud forecast, because it is the standard approach.
- **Production model:** A blended forecaster with a satellite-based nowcast model and a gradient boosting day-ahead model on weather forecasts and plant availability, with quantiles and capacity clipping.
- **Intended use:** Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve.
- **Out of scope:** - Plant owner name: irrelevant.<br>- Inverter serial: an identifier.<br>- Report format: an artefact.
- **Primary metrics:** - Skill against persistence<br>- Ramp detection<br>- Quantile coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Feeder, region and voltage level<br>- Weather regime and season<br>- Asset age, vendor and customer segment<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Fast cloud edge<br>- Plant outage<br>- Snow cover
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve.
- **Label:** For "Solar Generation Forecasting": Forecast solar generation per plant and for distributed rooftop fleets from irradiance forecasts, satellite cloud motion and plant telemetry so balancing and curtailment decisions improve. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Nameplate capacity as truth.
- **Sources:** - **Source:** Forecast irradiance inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the weather feed.<br>- **Source:** Satellite cloud motion inputs<br>**Owner:** Asset management<br>**System Of Record:** Meter data management and billing (CIS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: computed from imagery.<br>- **Source:** Plant availability inputs<br>**Owner:** Retail and customer operations<br>**System Of Record:** Asset management and GIS<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from plant telemetry.<br>- **Source:** Panel soiling and age inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from plant history.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Nameplate capacity as truth<br>- One model for all horizons<br>- Ignoring cloud motion
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
