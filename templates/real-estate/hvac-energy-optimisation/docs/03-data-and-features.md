# HVAC Energy Optimisation: data and feature specification

> Generated from the blueprint `real-estate/hvac-energy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** HVAC Energy Optimisation · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "HVAC Energy Optimisation": Control heating and cooling setpoints to cut energy use while keeping comfort within limits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A simulator that does not match the real building gives gains that vanish on site.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Zone temperature | measured air temperature per zone with a sensor-quality flag | The state the controller tries to regulate | Sensors are noisy and can be placed badly |   |   |   |
| Weather forecast | forecast outside temperature and solar load for the next 6 hours | Lets the controller pre-cool or pre-heat | Forecasts have errors, so use ranges |   |   |   |
| Occupancy forecast | expected number of people per zone from bookings and badge counts | The main source of internal load | Data are aggregate and not personal |   |   |   |
| Energy price | time-of-use tariff and demand charge periods | Allows load shifting to cheaper periods | Tariffs change, so load them from a table |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Comfort | A comfort constraint that must hold while saving energy | Energy use alone as the objective | A cold or hot office produces complaints, and the controller is switched off |
| Model | A thermal model fitted to the specific building | Generic rules applied to all buildings | Buildings differ in mass, glazing and layout, so what works in one wastes energy in another |
| Safety | Hard limits enforced outside the learned policy | A learned policy trusted to stay safe | A learning system can try unsafe actions, so limits must be enforced by the BMS |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Building name | A label that does not carry thermal behaviour |
| Valve ID | An identifier for equipment with no information on state |
| Sensor brand | Drift characteristics may differ but the brand name itself does not help |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Zone temperature inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: sensors are noisy and can be placed badly. |
| Weather forecast inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: forecasts have errors, so use ranges. |
| Occupancy forecast inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: data are aggregate and not personal. |
| Energy price inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: tariffs change, so load them from a table. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: hvac_energy_optimisation_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: zone_temperature, type: double, nullable: false }
    - { name: weather_forecast, type: double, nullable: false }
    - { name: occupancy_forecast, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Zone temperature and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Weather forecast against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Zone temperature, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE hvac_energy_optimisation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  zone_temperature                   DOUBLE PRECISION,
  weather_forecast                   DOUBLE PRECISION,
  occupancy_forecast                 DOUBLE PRECISION,
  energy_price                       DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE hvac_energy_optimisation_decisions (
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
CREATE TABLE hvac_energy_optimisation_labels (
  decision_id    UUID        NOT NULL REFERENCES hvac_energy_optimisation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "HVAC Energy Optimisation": Control heating and cooling setpoints to cut energy use while keeping comfort within limits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Zone temperature | Measured air temperature per zone with a sensor-quality flag. The state the controller tries to regulate. | Leakage risk to design against: Sensors are noisy and can be placed badly. |
| A signal-versus-noise trap in this use case: Comfort | The true signal is a comfort constraint that must hold while saving energy; the common noise is energy use alone as the objective. | A cold or hot office produces complaints, and the controller is switched off. |

**Ask the experts**

- [ ] What exactly does "Zone temperature and air quality stay within comfort bounds at all times" mean in practice for hvac energy optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Zone temperature" and "Weather forecast", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "kWh" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: a simulator that does not match the real building gives gains that vanish on site, and who can confirm the cut-off times and splits?
- [ ] How often does "Sensor fault" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| BMS | Building management system: the control system that runs heating, cooling, lighting and sensors in a building. |
| Setpoint | The target temperature or other value a control system tries to maintain. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| EUI | Energy use intensity: energy used per unit of floor area per year. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Days on market | The number of days a listing takes to go under contract. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Policy | The rule that maps a situation to an action. |
| Reward | The number the system tries to maximise over time. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Distribution shift | A change in the data a model sees compared with training. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
