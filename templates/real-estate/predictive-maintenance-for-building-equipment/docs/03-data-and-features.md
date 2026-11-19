# Predictive Maintenance for Building Equipment: data and feature specification

> Generated from the blueprint `real-estate/predictive-maintenance-for-building-equipment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Maintenance for Building Equipment · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Predictive Maintenance for Building Equipment": Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Maintenance resets the history, so a repaired machine looks as though it had no problem.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Vibration trend | slope of RMS vibration over the last 14 days | Bearings and rotors show wear as rising vibration | Sensors loosen and drift, so calibrate per sensor |   |   |   |
| Efficiency drift | rise in kilowatts per ton of cooling or per unit of heat at similar load | Degradation shows up as a loss of efficiency | Weather changes the baseline, so normalise by load and temperature |   |   |   |
| Runtime hours | hours since the last service | A simple, reliable age measure | Logging gaps and meter replacements reset the counter |   |   |   |
| Fault codes | count of controller alarm codes by type in the last 7 days | Controllers see problems before technicians do | Alarms are noisy, so count only the codes linked to failures |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Lead | Early warning with enough lead time to schedule a repair | Detection at or after failure | A late alert cannot prevent the breakdown and only confirms it |
| Context | Operating mode, load and outside temperature | Fixed raw thresholds | Normal behaviour at full load or in summer looks like a fault to a fixed limit |
| Cost | The cost of false alarms and unnecessary callouts | Recall alone | Every callout costs money and technician time, so a model with many false alarms is ignored |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Equipment name | A label that differs by site and does not predict failure |
| Installer | Weakly related to wear once the model and age are known |
| Building colour | No physical link to equipment condition |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Vibration trend inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: sensors loosen and drift, so calibrate per sensor. |
| Efficiency drift inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: weather changes the baseline, so normalise by load and temperature. |
| Runtime hours inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: logging gaps and meter replacements reset the counter. |
| Fault codes inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: alarms are noisy, so count only the codes linked to failures. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: predictive_maintenance_for_building_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: vibration_trend, type: double, nullable: false }
    - { name: efficiency_drift, type: double, nullable: false }
    - { name: runtime_hours, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Vibration trend and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Efficiency drift against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Vibration trend, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE predictive_maintenance_for_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE predictive_maintenance_for_outputs (
  run_id TEXT NOT NULL REFERENCES predictive_maintenance_for_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE predictive_maintenance_for_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE predictive_maintenance_for_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Predictive Maintenance for Building Equipment": Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Vibration trend | Slope of RMS vibration over the last 14 days. Bearings and rotors show wear as rising vibration. | Leakage risk to design against: Sensors loosen and drift, so calibrate per sensor. |
| A signal-versus-noise trap in this use case: Lead | The true signal is early warning with enough lead time to schedule a repair; the common noise is detection at or after failure. | A late alert cannot prevent the breakdown and only confirms it. |

**Ask the experts**

- [ ] What exactly does "Alerts raised with at least 7 days of lead time" mean in practice for predictive maintenance for building equipment: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Vibration trend" and "Efficiency drift", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unplanned downtime" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: maintenance resets the history, so a repaired machine looks as though it had no problem, and who can confirm the cut-off times and splits?
- [ ] How often does "Sensor drift" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| BMS | Building management system: the control system that runs heating, cooling, lighting and sensors in a building. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Days on market | The number of days a listing takes to go under contract. |
| EUI | Energy use intensity: energy used per unit of floor area per year. |
| Critical path | The longest chain of dependent tasks, which determines the project's earliest completion date. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
