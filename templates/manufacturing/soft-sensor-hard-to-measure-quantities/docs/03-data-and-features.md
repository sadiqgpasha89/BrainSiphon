# Soft Sensor for Hard-to-Measure Quantities: data and feature specification

> Generated from the blueprint `manufacturing/soft-sensor-hard-to-measure-quantities` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Soft Sensor for Hard-to-Measure Quantities · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Soft Sensor for Hard-to-Measure Quantities": Estimate quantities such as composition, viscosity or moisture that are measured rarely in a lab from fast process signals, so control and quality decisions can be made in real time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using sample time as process time.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lagged process signals | lagged temperature, flow and pressure features aligned to residence time | Primary drivers | Residence time from the process |   |   |   |
| Recent lab residual | error of the last lab values against the estimate | Online correction | Needs timely lab entry |   |   |   |
| Feed property indicators | measurements of the incoming material | Context | From analysers |   |   |   |
| Equipment state | fouling and wear indicators | Drift driver | From maintenance data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Target | Lab measurements aligned to the process time they represent | Lab sample time | Samples reflect the process earlier than they are logged |
| Delay | Dynamic features that model the process delay | Instantaneous values only | Material takes time to move through the plant |
| Trust | Uncertainty and automatic fallback | A point estimate | Operators stop trusting a sensor that is wrong once |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Lab technician | not a process variable |
| Sample bottle number | an identifier |
| Report time | a logging artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lagged process signals inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: residence time from the process. |
| Recent lab residual inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs timely lab entry. |
| Feed property indicators inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from analysers. |
| Equipment state inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from maintenance data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: soft_sensor_hard_to_measure_quantities_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lagged_process_signals, type: double, nullable: false }
    - { name: recent_lab_residual, type: double, nullable: false }
    - { name: feed_property_indicators, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Lagged process signals and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Recent lab residual against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lagged process signals, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jane Street Market Prediction | https://www.kaggle.com/c/jane-street-market-prediction | Competition rules; free Kaggle login | Anonymised market features with returns and a trade-or-not decision target | Anonymised and from one firm; check the data terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MoleculeNet | https://deepchem.readthedocs.io/en/latest/api_reference/moleculenet.html | MIT licence (see the site) | A benchmark collection of molecular property datasets (toxicity, solubility, binding) | Benchmark splits can be optimistic; use scaffold splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE soft_sensor_hard_to_measure_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  lagged_process_signals             DOUBLE PRECISION,
  recent_lab_residual                DOUBLE PRECISION,
  feed_property_indicators           DOUBLE PRECISION,
  equipment_state                    DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE soft_sensor_hard_to_measure_decisions (
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
CREATE TABLE soft_sensor_hard_to_measure_labels (
  decision_id    UUID        NOT NULL REFERENCES soft_sensor_hard_to_measure_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Soft Sensor for Hard-to-Measure Quantities": Estimate quantities such as composition, viscosity or moisture that are measured rarely in a lab from fast process signals, so control and quality decisions can be made in real time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Operational technology has its own safety and network rules | Control systems use PLCs, SCADA and industrial protocols on segmented networks. Changing them can stop production or hurt people, so analytics read data and recommend, while closed-loop control stays with validated systems. | An AI system that writes to a controller needs the same change control as any safety-related modification. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Lagged process signals | Lagged temperature, flow and pressure features aligned to residence time. Primary drivers. | Leakage risk to design against: Residence time from the process. |
| A signal-versus-noise trap in this use case: Target | The true signal is lab measurements aligned to the process time they represent; the common noise is lab sample time. | Samples reflect the process earlier than they are logged. |

**Ask the experts**

- [ ] What exactly does "Estimates with an uncertainty range" mean in practice for soft sensor for hard-to-measure quantities: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lagged process signals" and "Recent lab residual", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Off-spec batches" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using sample time as process time, and who can confirm the cut-off times and splits?
- [ ] How often does "Process change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Historian | A database for time-stamped sensor data from plants. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| SPC | Statistical process control: using control charts to detect process drift. |
| Supplier quality | The quality of incoming materials from suppliers. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| OPC UA | A standard protocol for exchanging industrial data. |
| Cp and Cpk | Measures of how well a process fits within specification limits. |
| Digital twin | A model of a machine or plant kept in step with real data. |
| Setpoint | The target value of a process variable. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Remaining useful life | The estimated time before a machine or component fails. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Distribution shift | A change in the data a model sees compared with training. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
