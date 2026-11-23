# Water and Waste Stream Anomaly Detection: data and feature specification

> Generated from the blueprint `manufacturing/water-waste-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Water and Waste Stream Anomaly Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Water and Waste Stream Anomaly Detection": Detect abnormal water use, effluent quality and waste volumes by line so leaks, spills and permit exceedances are found early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Absolute baselines.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Water per unit produced | litres per unit by line | Efficiency | From meters and production |   |   |   |
| Effluent quality indicators | pH, conductivity and load measures | Compliance | From analysers |   |   |   |
| Waste volume by stream | tonnes by waste class | Disposal cost | From scales |   |   |   |
| Production state | running, idle or cleaning | Baseline selection | From MES |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Use per unit of production | Absolute use | Use rises with output |
| Compliance | Limits from the permit with a margin | Internal targets only | Permit exceedances carry fines |
| Cause | Meter-level attribution | Site totals | Totals do not show where to look |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Meter name | an identifier |
| Operator name | irrelevant |
| Report format | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Water per unit produced inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from meters and production. |
| Effluent quality indicators inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from analysers. |
| Waste volume by stream inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from scales. |
| Production state inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from MES. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: water_waste_anomaly_detection_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: water_per_unit_produced, type: double, nullable: false }
    - { name: effluent_quality_indicators, type: double, nullable: false }
    - { name: waste_volume_by_stream, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Water per unit produced and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Effluent quality indicators against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Water per unit produced, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE water_waste_anomaly_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  water_per_unit_produced            DOUBLE PRECISION,
  effluent_quality_indicators        DOUBLE PRECISION,
  waste_volume_by_stream             DOUBLE PRECISION,
  production_state                   DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE water_waste_anomaly_detection_decisions (
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
CREATE TABLE water_waste_anomaly_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES water_waste_anomaly_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Water and Waste Stream Anomaly Detection": Detect abnormal water use, effluent quality and waste volumes by line so leaks, spills and permit exceedances are found early. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Water per unit produced | Litres per unit by line. Efficiency. | Leakage risk to design against: From meters and production. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is use per unit of production; the common noise is absolute use. | Use rises with output. |

**Ask the experts**

- [ ] What exactly does "Alarm before permit limits are reached" mean in practice for water and waste stream anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Water per unit produced" and "Effluent quality indicators", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Permit exceedances" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: absolute baselines, and who can confirm the cut-off times and splits?
- [ ] How often does "Cleaning cycles" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| MES | Manufacturing execution system: software that tracks production on the shop floor. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| Historian | A database for time-stamped sensor data from plants. |
| Cycle time | The time to complete one unit of work at a station. |
| Scrap | Material or parts that cannot be sold. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| Lean | A way of working that removes waste from processes. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Stationarity | A series whose statistical properties do not change over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
