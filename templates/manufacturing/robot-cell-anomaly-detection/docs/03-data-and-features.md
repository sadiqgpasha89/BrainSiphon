# Robot Cell Anomaly Detection: data and feature specification

> Generated from the blueprint `manufacturing/robot-cell-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Robot Cell Anomaly Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Robot Cell Anomaly Detection": Detect abnormal behaviour in robot cells from joint currents, torque and cycle signatures so drive wear, tool faults and programme errors are found early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Global torque limits.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Current profile deviation | distance between the cycle current profile and the baseline | Wear signal | Per step |   |   |   |
| Cycle time drift | change in cycle duration | Mechanical or programme change | By programme |   |   |   |
| Temperature and vibration | motor and gearbox measures | Wear | Per joint |   |   |   |
| Programme version | the robot programme in use | Prevents false alarms after edits | From the controller |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Cycle signatures per programme step and payload | A global torque limit | Torque varies with the move and the load |
| Location | Which joint and step deviated | A cell-level alarm | Technicians need the joint |
| Validation | Replayed seeded faults | Anomaly counts | Counts do not show missed faults |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Robot name | an identifier |
| Cell location alone | weak link |
| Operator name | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Current profile deviation inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: per step. |
| Cycle time drift inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: by programme. |
| Temperature and vibration inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: per joint. |
| Programme version inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the controller. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: robot_cell_anomaly_detection_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: current_profile_deviation, type: double, nullable: false }
    - { name: cycle_time_drift, type: double, nullable: false }
    - { name: temperature_and_vibration, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Current profile deviation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Cycle time drift against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Current profile deviation, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE robot_cell_anomaly_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  current_profile_deviation          DOUBLE PRECISION,
  cycle_time_drift                   DOUBLE PRECISION,
  temperature_and_vibration          DOUBLE PRECISION,
  programme_version                  DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE robot_cell_anomaly_detection_decisions (
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
CREATE TABLE robot_cell_anomaly_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES robot_cell_anomaly_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Robot Cell Anomaly Detection": Detect abnormal behaviour in robot cells from joint currents, torque and cycle signatures so drive wear, tool faults and programme errors are found early. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Operational technology has its own safety and network rules | Control systems use PLCs, SCADA and industrial protocols on segmented networks. Changing them can stop production or hurt people, so analytics read data and recommend, while closed-loop control stays with validated systems. | An AI system that writes to a controller needs the same change control as any safety-related modification. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Current profile deviation | Distance between the cycle current profile and the baseline. Wear signal. | Leakage risk to design against: Per step. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is cycle signatures per programme step and payload; the common noise is a global torque limit. | Torque varies with the move and the load. |

**Ask the experts**

- [ ] What exactly does "Baselines per robot programme and payload" mean in practice for robot cell anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Current profile deviation" and "Cycle time drift", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unplanned robot stops" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: global torque limits, and who can confirm the cut-off times and splits?
- [ ] How often does "Programme edit" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| SPC | Statistical process control: using control charts to detect process drift. |
| Vibration analysis | Using vibration signals to detect machine faults. |
| PLC | Programmable logic controller: a rugged computer that controls machines. |
| Historian | A database for time-stamped sensor data from plants. |
| Cycle time | The time to complete one unit of work at a station. |
| Cp and Cpk | Measures of how well a process fits within specification limits. |
| Setpoint | The target value of a process variable. |
| Poka-yoke | Mistake-proofing built into a process. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
