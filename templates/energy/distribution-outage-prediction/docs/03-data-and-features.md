# Distribution Outage Prediction: data and feature specification

> Generated from the blueprint `energy/distribution-outage-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Distribution Outage Prediction · **Domain:** energy · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Distribution Outage Prediction": Predict the chance of outages on each feeder section over the next days from weather, vegetation, asset age and history, so crews and spares are pre-positioned before storms. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using customer calls as labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Forecast wind gust and lightning | forecast gust speed and strike density at the section | Main storm driver | Interpolated to sections |   |   |   |
| Vegetation density near the line | canopy cover within the corridor | Tree contact risk | From imagery or survey |   |   |   |
| Asset age and condition | age of conductors, poles and switches | Failure propensity | From the asset register |   |   |   |
| Past outage count | outages on the section in the last three years | Persistent weak points | Excludes planned work |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Outages with confirmed cause and duration from the outage log | Customer calls | Calls cluster around a few sections and miss quiet failures |
| Weather | Forecast wind, ice and lightning at the section | Observed weather after the fact | Planning needs the forecast not the past |
| Use | Crew and spares pre-positioning | A single network-wide alert | Planners need ranked areas |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Feeder name | an identifier |
| Substation code alone | an identifier |
| Report author | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Forecast wind gust and lightning inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: interpolated to sections. |
| Vegetation density near the line inputs | Asset management | Meter data management and billing (CIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from imagery or survey. |
| Asset age and condition inputs | Retail and customer operations | Asset management and GIS | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the asset register. |
| Past outage count inputs | Network operations | SCADA and ADMS (advanced distribution management) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: excludes planned work. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: distribution_outage_prediction_inputs.v1
owner: network-operations@example.com
system_of_record: SCADA and ADMS (advanced distribution management)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: forecast_wind_gust_and_lightning, type: double, nullable: false }
    - { name: vegetation_density_near_the_line, type: double, nullable: false }
    - { name: asset_age_and_condition, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Forecast wind gust and lightning and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Vegetation density near the line against SCADA and ADMS (advanced distribution management)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Forecast wind gust and lightning, traces back to SCADA and ADMS (advanced distribution management); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE distribution_outage_prediction_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE distribution_outage_prediction_outputs (
  run_id TEXT NOT NULL REFERENCES distribution_outage_prediction_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE distribution_outage_prediction_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE distribution_outage_prediction_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Energy and utilities balance supply and demand second by second on physical networks that fail in the field. Weather, asset age and customer behaviour drive the data, outages carry safety and regulatory consequences, and control actions stay with licensed operators and protection systems. For this use case, "Distribution Outage Prediction": Predict the chance of outages on each feeder section over the next days from weather, vegetation, asset age and history, so crews and spares are pre-positioned before storms. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Outage management is a fault location problem | When a fault trips protection, operators locate it from smart meter, SCADA and customer calls, then restore supply in stages. Faster location shortens outage minutes. | Customer minutes lost are the regulated measure, so restoration order matters as much as detection. |
| Assets age and fail in the field | Transformers, cables, poles, pipes and pumps degrade with load, weather and time, and inspection data is sparse. Failures cause outages, safety incidents and environmental harm. | Asset health models must support the decision to inspect, repair or replace, within a safety-first culture. |
| Renewable output depends on weather | Solar and wind generation follow irradiance, cloud cover and wind speed, with ramps that are hard to predict. Forecast quality varies by site, season and horizon. | Probabilistic forecasts let operators size reserves, whereas point forecasts hide the risk. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Forecast wind gust and lightning | Forecast gust speed and strike density at the section. Main storm driver. | Leakage risk to design against: Interpolated to sections. |
| A signal-versus-noise trap in this use case: Label | The true signal is outages with confirmed cause and duration from the outage log; the common noise is customer calls. | Calls cluster around a few sections and miss quiet failures. |

**Ask the experts**

- [ ] What exactly does "Risk score per feeder section for 72 hours ahead" mean in practice for distribution outage prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Forecast wind gust and lightning" and "Vegetation density near the line", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Customer minutes lost" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using customer calls as labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Unprecedented storm" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Feeder | A distribution line that carries power from a substation to customers. |
| SAIDI | System average interruption duration index: average outage minutes per customer. |
| Vegetation management | Trimming trees near lines to prevent faults. |
| SAIFI | System average interruption frequency index: average number of outages per customer. |
| CAIDI | Customer average interruption duration index: average time to restore. |
| Load forecast | A prediction of electricity demand. |
| Outage management system | Software that tracks outages and crews. |
| Substation | A facility that transforms voltage and switches circuits. |
| Transformer | Equipment that changes voltage levels. |
| Demand response | Paying or asking customers to shift or cut use at peak times. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
