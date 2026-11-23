# Intraday Imbalance Risk Prediction: data and feature specification

> Generated from the blueprint `energy/intraday-imbalance-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Intraday Imbalance Risk Prediction · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Intraday Imbalance Risk Prediction": Predict the system imbalance direction and price risk for coming settlement periods so balancing responsible parties adjust positions before penalties hit. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using data after gate closure.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| System frequency and area control error | measured frequency deviation and error | Direction signal | Live |   |   |   |
| Renewable forecast revisions | change in wind and solar forecasts | Position error | From forecasts |   |   |   |
| Recent imbalance prices | prices in the last periods | Persistence | From settlement |   |   |   |
| Outage and ramp events | generator trips and scheduled ramps | Shock | From the market feed |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Realised settlement outcomes | Forecast errors alone | The cost is what the market charges |
| Timing | Features known before gate closure | Data available after the fact | Leakage makes the model useless live |
| Action | A position adjustment advice | An alert | Traders need a recommended size and cost |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Trader name | irrelevant |
| Report format | an artefact |
| Weather station id | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| System frequency and area control error inputs | Network operations | SCADA and ADMS (advanced distribution management) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: live. |
| Renewable forecast revisions inputs | Asset management | Meter data management and billing (CIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from forecasts. |
| Recent imbalance prices inputs | Retail and customer operations | Asset management and GIS | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from settlement. |
| Outage and ramp events inputs | Network operations | SCADA and ADMS (advanced distribution management) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the market feed. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: intraday_imbalance_prediction_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: system_frequency_and_area_control_error, type: double, nullable: false }
    - { name: renewable_forecast_revisions, type: double, nullable: false }
    - { name: recent_imbalance_prices, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on System frequency and area control error and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Renewable forecast revisions against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as System frequency and area control error, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Jane Street Market Prediction | https://www.kaggle.com/c/jane-street-market-prediction | Competition rules; free Kaggle login | Anonymised market features with returns and a trade-or-not decision target | Anonymised and from one firm; check the data terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE intraday_imbalance_prediction_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  system_frequency_and_area_control_error DOUBLE PRECISION,
  renewable_forecast_revisions       DOUBLE PRECISION,
  recent_imbalance_prices            DOUBLE PRECISION,
  outage_and_ramp_events             DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE intraday_imbalance_prediction_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE intraday_imbalance_prediction_labels (
  decision_id    UUID        NOT NULL REFERENCES intraday_imbalance_prediction_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Intraday Imbalance Risk Prediction": Predict the system imbalance direction and price risk for coming settlement periods so balancing responsible parties adjust positions before penalties hit. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Supply and demand must balance continuously | Electricity cannot be stored cheaply at scale, so generation, storage and demand response must match load in near real time. Forecast errors are paid for in reserves, imbalance charges or curtailment. | A forecast is judged by what its error costs the operator, not only by its average error. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: System frequency and area control error | Measured frequency deviation and error. Direction signal. | Leakage risk to design against: Live. |
| A signal-versus-noise trap in this use case: Label | The true signal is realised settlement outcomes; the common noise is forecast errors alone. | The cost is what the market charges. |

**Ask the experts**

- [ ] What exactly does "Direction forecast for the next 8 periods" mean in practice for intraday imbalance risk prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "System frequency and area control error" and "Renewable forecast revisions", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Imbalance cost" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using data after gate closure, and who can confirm the cut-off times and splits?
- [ ] How often does "Market rule change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Imbalance settlement | Charges for the difference between scheduled and actual energy. |
| Load forecast | A prediction of electricity demand. |
| Unit commitment | Choosing which generators to run over a day or week. |
| SAIFI | System average interruption frequency index: average number of outages per customer. |
| Capacity factor | Actual output divided by maximum possible output. |
| Time-of-use tariff | A price that depends on the time of day. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Train-serve skew | A difference between how features are computed in training and in production. |
