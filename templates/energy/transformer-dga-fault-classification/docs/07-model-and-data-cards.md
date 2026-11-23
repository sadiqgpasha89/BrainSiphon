# Transformer DGA Fault Classification: model card and data card

> Generated from the blueprint `energy/transformer-dga-fault-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Transformer DGA Fault Classification · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Standard gas ratio methods and limits from industry guides, because engineers know and trust them.
- **Production model:** A classifier combining ratio features, gas rates and loading context with confidence and abstention, checked against the standard method and routed to engineer review.
- **Intended use:** Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned.
- **Out of scope:** - Lab name: an identifier.<br>- Sample bottle id: an identifier.<br>- Report author: irrelevant.
- **Primary metrics:** - Class accuracy on confirmed faults<br>- Calibration<br>- Lead time of useful alerts
- **Measured values (fill in):** ____________
- **Slices reported:** - Feeder, region and voltage level<br>- Weather regime and season<br>- Asset age, vendor and customer segment<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Sampling error<br>- Oil treatment<br>- Mixed faults
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare fault types, new feeder configurations, extreme weather events and newly connected distributed generation; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned.
- **Label:** For "Transformer DGA Fault Classification": Classify the likely fault type in a transformer from dissolved gas trends and online monitors so the right inspection or outage is planned. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Ratio methods alone.
- **Sources:** - **Source:** Gas concentrations inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from lab or monitor.<br>- **Source:** Gas generation rate inputs<br>**Owner:** Asset management<br>**System Of Record:** Meter data management and billing (CIS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: time series.<br>- **Source:** Load and temperature context inputs<br>**Owner:** Retail and customer operations<br>**System Of Record:** Asset management and GIS<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from SCADA.<br>- **Source:** Past DGA classification inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the asset system.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Ratio methods alone<br>- Single-sample decisions<br>- Ignoring treatment events
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
