# Statistical Process Control Drift Detection: data and feature specification

> Generated from the blueprint `manufacturing/spc-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Statistical Process Control Drift Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Statistical Process Control Drift Detection": Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: One limit for mixed populations.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| CUSUM statistic | cumulative sum of deviations from the target | Detects small shifts | Reset after corrective action |   |   |   |
| EWMA residual | exponentially weighted moving residual | Smooth drift signal | Tune the weight per process |   |   |   |
| Run-rule violations | counts of Western Electric rule hits | Familiar to operators | Combine with the model score |   |   |   |
| Tool and chamber identifier | measurements split by tool | Finds the bad tool | Segment before charting |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Method | Charts that detect small shifts such as CUSUM and EWMA | Shewhart limits only | Slow drifts stay within the limits for days |
| Context | Limits set per product, tool and material | One limit for all | Mixed populations give wide limits and missed shifts |
| Action | A reason code tied to a response plan | An alarm | Alarms without a plan are ignored |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Operator name | not a cause |
| Measurement timestamp precision | an artefact |
| Product colour | no link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| CUSUM statistic inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: reset after corrective action. |
| EWMA residual inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: tune the weight per process. |
| Run-rule violations inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: combine with the model score. |
| Tool and chamber identifier inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: segment before charting. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: spc_drift_detection_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: cusum_statistic, type: double, nullable: false }
    - { name: ewma_residual, type: double, nullable: false }
    - { name: run_rule_violations, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on CUSUM statistic and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for EWMA residual against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as CUSUM statistic, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE spc_drift_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  cusum_statistic                    DOUBLE PRECISION,
  ewma_residual                      DOUBLE PRECISION,
  run_rule_violations                DOUBLE PRECISION,
  tool_and_chamber_identifier        DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE spc_drift_detection_decisions (
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
CREATE TABLE spc_drift_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES spc_drift_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Statistical Process Control Drift Detection": Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Operational technology has its own safety and network rules | Control systems use PLCs, SCADA and industrial protocols on segmented networks. Changing them can stop production or hurt people, so analytics read data and recommend, while closed-loop control stays with validated systems. | An AI system that writes to a controller needs the same change control as any safety-related modification. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: CUSUM statistic | Cumulative sum of deviations from the target. Detects small shifts. | Leakage risk to design against: Reset after corrective action. |
| A signal-versus-noise trap in this use case: Method | The true signal is charts that detect small shifts such as CUSUM and EWMA; the common noise is shewhart limits only. | Slow drifts stay within the limits for days. |

**Ask the experts**

- [ ] What exactly does "Alert false alarm rate under one per line per week" mean in practice for statistical process control drift detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "CUSUM statistic" and "EWMA residual", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time from drift onset to action" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: one limit for mixed populations, and who can confirm the cut-off times and splits?
- [ ] How often does "Planned recipe change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| SPC | Statistical process control: using control charts to detect process drift. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| Setpoint | The target value of a process variable. |
| Historian | A database for time-stamped sensor data from plants. |
| Cp and Cpk | Measures of how well a process fits within specification limits. |
| Recipe | The set of parameters used to make a product. |
| Poka-yoke | Mistake-proofing built into a process. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| PLC | Programmable logic controller: a rugged computer that controls machines. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Distribution shift | A change in the data a model sees compared with training. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Level shift | An abrupt, lasting change in a series' average. |
