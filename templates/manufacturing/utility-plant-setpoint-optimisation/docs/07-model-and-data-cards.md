# Utility Plant Setpoint Optimisation: model card and data card

> Generated from the blueprint `manufacturing/utility-plant-setpoint-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Utility Plant Setpoint Optimisation · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed staging rules and setpoints by season, because they are the standard operating procedures.
- **Production model:** A model-predictive or optimisation layer on equipment curves and forecasts that proposes staging and setpoints, advice-only at first with matched-control evaluation and a safety clip.
- **Intended use:** Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits.
- **Out of scope:** - Operator name: irrelevant.<br>- Equipment tag: an identifier.<br>- Log timestamp precision: an artefact.
- **Primary metrics:** - Predicted versus measured energy on matched periods<br>- Safety clip rate<br>- Forecast error
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Equipment failure<br>- Tariff change<br>- Sensor drift
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits.
- **Label:** For "Utility Plant Setpoint Optimisation": Recommend chiller, boiler and cooling tower setpoints and staging to meet plant demand at the lowest energy cost within comfort and process limits. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Learned safety limits.
- **Sources:** - **Source:** Equipment efficiency curve inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: fit per equipment.<br>- **Source:** Load forecast inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the energy forecast.<br>- **Source:** Weather and wet-bulb temperature inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: forecast.<br>- **Source:** Electricity tariff period inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the tariff.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Learned safety limits<br>- Raw before-and-after savings<br>- Ignoring weather
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
