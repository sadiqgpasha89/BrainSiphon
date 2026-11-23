# Battery State of Health Estimation: data and feature specification

> Generated from the blueprint `energy/battery-state-of-health-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Battery State of Health Estimation · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Battery State of Health Estimation": Estimate battery capacity and resistance from operating data without full test cycles so ageing is tracked and the end of life is planned. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Vendor estimate only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Capacity from partial charge | capacity inferred from partial cycles | Core estimate | Normalised |   |   |   |
| Internal resistance trend | rise in resistance | Ageing | From current and voltage |   |   |   |
| Temperature exposure | time at high temperature | Ageing driver | From sensors |   |   |   |
| Cycle depth and rate | depth of discharge and C-rate | Ageing driver | From telemetry |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Truth | Periodic reference capacity tests | The management system estimate alone | Vendor estimates drift |
| Data | Partial and noisy cycles | Full test cycles | Real use rarely gives full cycles |
| Use | End of life planning and warranty | A health score | Planners need time to replacement |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Site name | an identifier |
| Operator name | irrelevant |
| Log format | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Capacity from partial charge inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: normalised. |
| Internal resistance trend inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from current and voltage. |
| Temperature exposure inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from sensors. |
| Cycle depth and rate inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from telemetry. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: battery_state_of_health_estimation_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: capacity_from_partial_charge, type: double, nullable: false }
    - { name: internal_resistance_trend, type: double, nullable: false }
    - { name: temperature_exposure, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Capacity from partial charge and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Internal resistance trend against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Capacity from partial charge, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE battery_state_of_health_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE battery_state_of_health_outputs (
  run_id TEXT NOT NULL REFERENCES battery_state_of_health_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE battery_state_of_health_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE battery_state_of_health_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Battery State of Health Estimation": Estimate battery capacity and resistance from operating data without full test cycles so ageing is tracked and the end of life is planned. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Assets age and fail in the field | Transformers, cables, poles, pipes and pumps degrade with load, weather and time, and inspection data is sparse. Failures cause outages, safety incidents and environmental harm. | Asset health models must support the decision to inspect, repair or replace, within a safety-first culture. |
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Smart meters produce large volumes of interval data | Meters report consumption at short intervals, which supports billing, loss detection and demand analytics but raises privacy concerns because the pattern reveals household behaviour. | Analytics should use aggregation and access controls and avoid inferring sensitive household behaviour. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Capacity from partial charge | Capacity inferred from partial cycles. Core estimate. | Leakage risk to design against: Normalised. |
| A signal-versus-noise trap in this use case: Truth | The true signal is periodic reference capacity tests; the common noise is the management system estimate alone. | Vendor estimates drift. |

**Ask the experts**

- [ ] What exactly does "Capacity estimate with an interval" mean in practice for battery state of health estimation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Capacity from partial charge" and "Internal resistance trend", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Replacement timing error" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: vendor estimate only, and who can confirm the cut-off times and splits?
- [ ] How often does "Sensor drift" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| State of charge | How full a battery is. |
| Battery storage | Batteries that store energy for later use. |
| Condition-based maintenance | Maintaining assets when their condition requires it. |
| DERMS | Distributed energy resource management system for rooftop solar, batteries and similar assets. |
| DER | Distributed energy resources such as rooftop solar, batteries and electric vehicles. |
| Transformer | Equipment that changes voltage levels. |
| Dispatch | Deciding which generators or batteries produce and when. |
| Capacity factor | Actual output divided by maximum possible output. |
| Meter data management | The system that stores and validates meter readings. |
| Imbalance settlement | Charges for the difference between scheduled and actual energy. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
