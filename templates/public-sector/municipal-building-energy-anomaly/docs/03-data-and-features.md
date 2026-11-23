# Municipal Building Energy Anomaly Detection: data and feature specification

> Generated from the blueprint `public-sector/municipal-building-energy-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Municipal Building Energy Anomaly Detection · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Municipal Building Energy Anomaly Detection": Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Absolute use comparisons.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Weather-adjusted consumption | use against expected for the weather | Core signal | From meters |   |   |   |
| Schedule deviation | operation outside opening hours | Waste | From schedules |   |   |   |
| Equipment alarms | heating and ventilation faults | Cause | From building systems |   |   |   |
| Occupancy proxy | aggregated occupancy or CO2 trends | Context | From sensors |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Weather- and schedule-adjusted use | Absolute use | Use changes with season and occupancy |
| Action | A ranked list with likely cause | A heat map | Facilities teams need a task |
| Equity | Comfort and service not reduced to save energy | Cutting use blindly | Some buildings are under-heated |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Building name | an identifier |
| Caretaker name | irrelevant |
| Photo name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Weather-adjusted consumption inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from meters. |
| Schedule deviation inputs | Programme and policy owners | Tax, benefits and licensing systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from schedules. |
| Equipment alarms inputs | City operations | GIS and asset management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from building systems. |
| Occupancy proxy inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from sensors. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: municipal_building_energy_anomaly_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: weather_adjusted_consumption, type: double, nullable: false }
    - { name: schedule_deviation, type: double, nullable: false }
    - { name: equipment_alarms, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Weather-adjusted consumption and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Schedule deviation against Case management and CRM
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Weather-adjusted consumption, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE municipal_building_energy_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE municipal_building_energy_outputs (
  run_id TEXT NOT NULL REFERENCES municipal_building_energy_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE municipal_building_energy_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE municipal_building_energy_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Municipal Building Energy Anomaly Detection": Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fraud and error are different problems | Improper payments arise from fraud, administrative error and misunderstanding. Treating all of them as fraud leads to harmful accusations and chases the wrong cause. | Cases flagged by a model should be reviewed by a person and handled proportionately. |
| Cities run on shared infrastructure data | Traffic, transit, lighting, waste, water and buildings produce sensor and operational data owned by different departments. Value comes from joining them for operations and planning. | Without shared identifiers and governance, every project builds its own isolated pipeline. |
| Planning relies on forecasts with uncertainty | Housing, schools, transport and services are planned from population, demand and land-use forecasts that carry wide uncertainty, so scenarios matter more than single numbers. | A single forecast presented as certain can lock in the wrong capacity. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Weather-adjusted consumption | Use against expected for the weather. Core signal. | Leakage risk to design against: From meters. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is weather- and schedule-adjusted use; the common noise is absolute use. | Use changes with season and occupancy. |

**Ask the experts**

- [ ] What exactly does "Baselines weather-adjusted per building" mean in practice for municipal building energy anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Weather-adjusted consumption" and "Schedule deviation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Energy per square metre" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: absolute use comparisons, and who can confirm the cut-off times and splits?
- [ ] How often does "Occupancy change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Smart city | A city that uses connected sensors and data to run services. |
| Zoning | Rules that decide what can be built where. |
| Traffic signal | A signal that controls traffic flow at junctions. |
| Street lighting | Lights on public roads. |
| 311 service | A non-emergency service line for city issues. |
| Open data | Data published for anyone to reuse. |
| Pseudonymisation | Replacing identifiers with codes to reduce identification risk. |
| Service level | A target for response or resolution time. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Stationarity | A series whose statistical properties do not change over time. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
