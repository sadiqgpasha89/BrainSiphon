# Indoor Air Quality & Comfort Anomaly Detection: data and feature specification

> Generated from the blueprint `real-estate/indoor-air-quality-and-comfort-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Indoor Air Quality & Comfort Anomaly Detection · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Indoor Air Quality & Comfort Anomaly Detection": Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Few labelled events, so recall is poorly estimated.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| CO2 vs occupancy | residual between measured CO2 and the CO2 expected for the current occupancy | Isolates ventilation faults from normal use | Occupancy counts are noisy, so smooth them |   |   |   |
| Humidity drift | slope of relative humidity over 7 days with a seasonal baseline | A rising trend signals mould risk | Seasonal effects are strong, so compare with the same season |   |   |   |
| Particulate spike | PM2.5 rise above the rolling baseline, compared with outdoor PM2.5 | Detects indoor sources and filter failure | Outdoor pollution enters, so compare with outside |   |   |   |
| Temperature gradient | difference in temperature between adjacent zones and between floor and ceiling sensors | Shows comfort and airflow problems | Sensor placement bias affects it |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Context | Baselines that depend on occupancy and ventilation state | Fixed thresholds for every room | A full meeting room raises CO2 for an hour and is normal, but a fixed threshold alarms on it |
| Sensor | Sensor faults separated from real events | Every anomaly treated as an environmental event | A drifting or stuck sensor looks like an event and misleads facilities |
| Action | Alerts that tell facilities what to check and where | Raw alarms with no context | Too many alarms cause fatigue, and nobody responds to the one that matters |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Room name | A label that carries no information on air quality |
| Sensor ID | A device label that does not describe conditions |
| Floor | Floor number has weak relation once the ventilation system is known |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| CO2 vs occupancy inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: occupancy counts are noisy, so smooth them. |
| Humidity drift inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: seasonal effects are strong, so compare with the same season. |
| Particulate spike inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: outdoor pollution enters, so compare with outside. |
| Temperature gradient inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: sensor placement bias affects it. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: indoor_air_quality_and_comfort_anomaly_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: co2_vs_occupancy, type: double, nullable: false }
    - { name: humidity_drift, type: double, nullable: false }
    - { name: particulate_spike, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on CO2 vs occupancy and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Humidity drift against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as CO2 vs occupancy, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE indoor_air_quality_and_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  co2_vs_occupancy                   DOUBLE PRECISION,
  humidity_drift                     DOUBLE PRECISION,
  particulate_spike                  DOUBLE PRECISION,
  temperature_gradient               DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE indoor_air_quality_and_decisions (
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
CREATE TABLE indoor_air_quality_and_labels (
  decision_id    UUID        NOT NULL REFERENCES indoor_air_quality_and_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Indoor Air Quality & Comfort Anomaly Detection": Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: CO2 vs occupancy | Residual between measured CO2 and the CO2 expected for the current occupancy. Isolates ventilation faults from normal use. | Leakage risk to design against: Occupancy counts are noisy, so smooth them. |
| A signal-versus-noise trap in this use case: Context | The true signal is baselines that depend on occupancy and ventilation state; the common noise is fixed thresholds for every room. | A full meeting room raises CO2 for an hour and is normal, but a fixed threshold alarms on it. |

**Ask the experts**

- [ ] What exactly does "Alerts are tuned to occupancy and room use so normal meetings do not alarm" mean in practice for indoor air quality & comfort anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "CO2 vs occupancy" and "Humidity drift", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Complaints" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: few labelled events, so recall is poorly estimated, and who can confirm the cut-off times and splits?
- [ ] How often does "Sensor drift" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| BMS | Building management system: the control system that runs heating, cooling, lighting and sensors in a building. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Days on market | The number of days a listing takes to go under contract. |
| RevPAR | Revenue per available room or unit: revenue divided by available room-nights. |
| Setpoint | The target temperature or other value a control system tries to maintain. |
| Assessed value | The value a tax authority assigns to a property for property tax. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Stationarity | A series whose statistical properties do not change over time. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
