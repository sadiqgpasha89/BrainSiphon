# Wildfire Ignition Risk Forecasting: data and feature specification

> Generated from the blueprint `energy/wildfire-ignition-risk-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wildfire Ignition Risk Forecasting · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Wildfire Ignition Risk Forecasting": Forecast the chance that conditions and equipment could start a fire for each network segment so operators and planners can decide on inspections, covered conductor work and temporary protection settings. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Automated shutoff decisions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Wind gust and direction forecast | forecast wind speed and direction | Main driver | From weather models |   |   |   |
| Fuel moisture and vegetation dryness | fuel state | Spread potential | From satellite and sensors |   |   |   |
| Equipment type and condition | conductor, hardware and protection type | Ignition source | From the register |   |   |   |
| Recent faults and operations | faults and reclose events | Ignition risk | From SCADA |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Role | Decision support for protocols run by people | An automated shutoff trigger | Shutoffs affect safety and need accountable decisions |
| Label | Ignition events and near misses with cause | Fire counts alone | Fires have many causes |
| Uncertainty | Scenario ranges for wind and fuel moisture | A single risk score | Conditions change quickly |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Segment name | an identifier |
| Report author | irrelevant |
| Map layer name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Wind gust and direction forecast inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from weather models. |
| Fuel moisture and vegetation dryness inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from satellite and sensors. |
| Equipment type and condition inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the register. |
| Recent faults and operations inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from SCADA. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: wildfire_ignition_risk_forecasting_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: wind_gust_and_direction_forecast, type: double, nullable: false }
    - { name: fuel_moisture_and_vegetation_dryness, type: double, nullable: false }
    - { name: equipment_type_and_condition, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Wind gust and direction forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Fuel moisture and vegetation dryness against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Wind gust and direction forecast, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE wildfire_ignition_risk_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE wildfire_ignition_risk_outputs (
  run_id TEXT NOT NULL REFERENCES wildfire_ignition_risk_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE wildfire_ignition_risk_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE wildfire_ignition_risk_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Wildfire Ignition Risk Forecasting": Forecast the chance that conditions and equipment could start a fire for each network segment so operators and planners can decide on inspections, covered conductor work and temporary protection settings. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Operators and protection systems hold control | Grid, gas and water operations are safety-critical and regulated. AI recommends and forecasts, while switching, dispatch and protection stay with licensed operators and certified systems. | A recommendation that cannot be explained or overridden will not be used in a control room. |
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Assets age and fail in the field | Transformers, cables, poles, pipes and pumps degrade with load, weather and time, and inspection data is sparse. Failures cause outages, safety incidents and environmental harm. | Asset health models must support the decision to inspect, repair or replace, within a safety-first culture. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Wind gust and direction forecast | Forecast wind speed and direction. Main driver. | Leakage risk to design against: From weather models. |
| A signal-versus-noise trap in this use case: Role | The true signal is decision support for protocols run by people; the common noise is an automated shutoff trigger. | Shutoffs affect safety and need accountable decisions. |

**Ask the experts**

- [ ] What exactly does "Segment risk for the next 72 hours with updates every 6 hours" mean in practice for wildfire ignition risk forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Wind gust and direction forecast" and "Fuel moisture and vegetation dryness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Ignition events" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: automated shutoff decisions, and who can confirm the cut-off times and splits?
- [ ] How often does "Rapid weather shift" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| SCADA | Supervisory control and data acquisition: systems that monitor and control the network. |
| Vegetation management | Trimming trees near lines to prevent faults. |
| Load forecast | A prediction of electricity demand. |
| Capacity factor | Actual output divided by maximum possible output. |
| Condition-based maintenance | Maintaining assets when their condition requires it. |
| Imbalance settlement | Charges for the difference between scheduled and actual energy. |
| Protection relay | A device that trips a circuit during a fault. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Exogenous variable | An input from outside the series, such as price or weather, used to explain it. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| F1 score | The harmonic mean of precision and recall. |
