# Urban Flood Risk Forecasting: data and feature specification

> Generated from the blueprint `public-sector/urban-flood-risk-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Urban Flood Risk Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Urban Flood Risk Forecasting": Forecast street-level flood risk from rainfall forecasts, drainage state and river levels so the city can pre-position pumps, close roads and warn residents in time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rainfall thresholds only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Rainfall nowcast and forecast | radar and model rainfall | Main driver | From weather services |   |   |   |
| Drain and pump status | blocked drains and pump availability | Capacity | From telemetry and work orders |   |   |   |
| River and tide levels | gauge levels | Boundary condition | From gauges |   |   |   |
| Ground saturation | recent rainfall and soil moisture | Runoff | From satellites and models |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Truth | Observed flooding from reports, gauges and imagery | Rainfall totals | Totals do not show where water collects |
| Model | A drainage network model with learned corrections | A pure statistical map | Drainage blockage and capacity matter |
| Action | Warnings and pre-positioned crews | A map only | Operators need actions and timing |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Gauge name | an identifier |
| Report author | irrelevant |
| Map style | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Rainfall nowcast and forecast inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from weather services. |
| Drain and pump status inputs | Programme and policy owners | Tax, benefits and licensing systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from telemetry and work orders. |
| River and tide levels inputs | City operations | GIS and asset management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from gauges. |
| Ground saturation inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from satellites and models. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: urban_flood_risk_forecasting_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: rainfall_nowcast_and_forecast, type: double, nullable: false }
    - { name: drain_and_pump_status, type: double, nullable: false }
    - { name: river_and_tide_levels, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Rainfall nowcast and forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Drain and pump status against Case management and CRM
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Rainfall nowcast and forecast, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE urban_flood_risk_forecasting_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE urban_flood_risk_forecasting_outputs (
  run_id TEXT NOT NULL REFERENCES urban_flood_risk_forecasting_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE urban_flood_risk_forecasting_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE urban_flood_risk_forecasting_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Urban Flood Risk Forecasting": Forecast street-level flood risk from rainfall forecasts, drainage state and river levels so the city can pre-position pumps, close roads and warn residents in time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Planning relies on forecasts with uncertainty | Housing, schools, transport and services are planned from population, demand and land-use forecasts that carry wide uncertainty, so scenarios matter more than single numbers. | A single forecast presented as certain can lock in the wrong capacity. |
| Cities run on shared infrastructure data | Traffic, transit, lighting, waste, water and buildings produce sensor and operational data owned by different departments. Value comes from joining them for operations and planning. | Without shared identifiers and governance, every project builds its own isolated pipeline. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Rainfall nowcast and forecast | Radar and model rainfall. Main driver. | Leakage risk to design against: From weather services. |
| A signal-versus-noise trap in this use case: Truth | The true signal is observed flooding from reports, gauges and imagery; the common noise is rainfall totals. | Totals do not show where water collects. |

**Ask the experts**

- [ ] What exactly does "Risk maps for the next 6 hours updated every 15 minutes" mean in practice for urban flood risk forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Rainfall nowcast and forecast" and "Drain and pump status", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Properties flooded" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: rainfall thresholds only, and who can confirm the cut-off times and splits?
- [ ] How often does "Blocked drain" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| 311 service | A non-emergency service line for city issues. |
| Smart city | A city that uses connected sensors and data to run services. |
| Digital twin | A model of a city or asset kept current with real data. |
| Street lighting | Lights on public roads. |
| Asset register | A list of infrastructure assets and their condition. |
| Pseudonymisation | Replacing identifiers with codes to reduce identification risk. |
| Service level | A target for response or resolution time. |
| Policy simulation | Testing how a policy change would affect people and budgets. |
| Budget forecast | A prediction of public revenue and spending. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Exogenous variable | An input from outside the series, such as price or weather, used to explain it. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
