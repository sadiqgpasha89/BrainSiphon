# Structural Health Monitoring: data and feature specification

> Generated from the blueprint `engineering/structural-health-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Structural Health Monitoring · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Structural Health Monitoring": Detect abnormal structural behaviour from strain, vibration, tilt and temperature sensors on bridges and buildings and alert engineers with context, separating environmental effects from real change. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fixed limits.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Strain and displacement | measured response | Core | From sensors |   |   |   |
| Modal frequencies | natural frequency shifts | Core | From vibration data |   |   |   |
| Temperature and load | environmental drivers | Compensation | From weather and traffic data |   |   |   |
| Sensor health | drift and dropouts | Quality | From diagnostics |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Normal behaviour by temperature and load | A fixed limit | Daily and seasonal effects dominate readings |
| Label | Inspections and confirmed damage | Alarm counts | Alarms may be sensor faults |
| Role | Early warning for engineers | Safety declaration | Structural safety needs engineering judgement |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Sensor id | an identifier |
| Installer name | personal data |
| Cable colour | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Strain and displacement inputs | Engineering management | CAD, BIM and document management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from sensors. |
| Modal frequencies inputs | Project delivery | Project scheduling and cost control platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from vibration data. |
| Temperature and load inputs | Health, safety and quality | Quality, safety and inspection records | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from weather and traffic data. |
| Sensor health inputs | Engineering management | CAD, BIM and document management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from diagnostics. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: structural_health_monitoring_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: strain_and_displacement, type: double, nullable: false }
    - { name: modal_frequencies, type: double, nullable: false }
    - { name: temperature_and_load, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Strain and displacement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Modal frequencies against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Strain and displacement, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Server Machine Dataset (OmniAnomaly) | https://github.com/NetManAIOps/OmniAnomaly | MIT licence (see the repository) | Multivariate server metrics from an internet company with labelled anomalies | One company; coarse labels. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE structural_health_monitoring_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  strain_and_displacement            DOUBLE PRECISION,
  modal_frequencies                  DOUBLE PRECISION,
  temperature_and_load               DOUBLE PRECISION,
  sensor_health                      DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE structural_health_monitoring_decisions (
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
CREATE TABLE structural_health_monitoring_labels (
  decision_id    UUID        NOT NULL REFERENCES structural_health_monitoring_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Structural Health Monitoring": Detect abnormal structural behaviour from strain, vibration, tilt and temperature sensors on bridges and buildings and alert engineers with context, separating environmental effects from real change. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Site safety is about conditions | Hazards such as open edges, exclusion zones and plant movement can be detected at scene level. Monitoring individual workers raises legal and trust issues. | Safety tools support inspections and do not replace them. |
| Inspection finds defects before they are built in | Welds, concrete and structures are checked by qualified inspectors with measurements and images. Models can prioritise and highlight, but acceptance remains a human, certified decision. | A missed severe defect costs far more than a recheck, so recall matters. |
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Strain and displacement | Measured response. Core. | Leakage risk to design against: From sensors. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is normal behaviour by temperature and load; the common noise is a fixed limit. | Daily and seasonal effects dominate readings. |

**Ask the experts**

- [ ] What exactly does "Alerts reviewed by a structural engineer" mean in practice for structural health monitoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Strain and displacement" and "Modal frequencies", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Damage found early" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: fixed limits, and who can confirm the cut-off times and splits?
- [ ] How often does "Sensor failure" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Structural health monitoring | Using sensors to track the condition of structures. |
| BIM | Building information modelling: a digital model of a building or asset with data. |
| Change order | A formal change to scope, cost or time. |
| Fatigue | Damage from repeated loading. |
| Digital twin | A model kept current with real data from an asset. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
