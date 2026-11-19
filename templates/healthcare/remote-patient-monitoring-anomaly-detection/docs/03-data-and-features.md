# Remote Patient Monitoring Anomaly Detection: data and feature specification

> Generated from the blueprint `healthcare/remote-patient-monitoring-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Remote Patient Monitoring Anomaly Detection · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Remote Patient Monitoring Anomaly Detection": Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Alerts judged only by acted-upon ones.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Deviation from personal baseline | robust z-score over 14 days | Change | Window excludes current reading |   |   |   |
| Trend slope over 3 days | weight gain slope for heart-failure patients | Decompensation | Measurement timing adjustment |   |   |   |
| Measurement gap duration | days since last reading | Engagement | Distinguish device failure |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Baseline | Per-patient adaptive baselines | Population thresholds | Normal differs widely between patients |
| Missingness | Non-adherence as a signal handled separately | Imputing and ignoring gaps | A silent patient may be the sick one |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Single outlier reading | measurement error |
| Day of week | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Deviation from personal baseline inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: window excludes current reading. |
| Trend slope over 3 days inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: measurement timing adjustment. |
| Measurement gap duration inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: distinguish device failure. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: remote_patient_monitoring_anomaly_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: deviation_from_personal_baseline, type: double, nullable: false }
    - { name: trend_slope_over_3_days, type: double, nullable: false }
    - { name: measurement_gap_duration, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Deviation from personal baseline and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Trend slope over 3 days against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Deviation from personal baseline, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Server Machine Dataset (OmniAnomaly) | https://github.com/NetManAIOps/OmniAnomaly | MIT licence (see the repository) | Multivariate server metrics from an internet company with labelled anomalies | One company; coarse labels. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE remote_patient_monitoring_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  deviation_from_personal_baseline   DOUBLE PRECISION,
  trend_slope_over_3_days            DOUBLE PRECISION,
  measurement_gap_duration           DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE remote_patient_monitoring_decisions (
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
CREATE TABLE remote_patient_monitoring_labels (
  decision_id    UUID        NOT NULL REFERENCES remote_patient_monitoring_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Remote Patient Monitoring Anomaly Detection": Detect clinically meaningful changes in home-monitoring data (weight, BP, glucose, SpO2) and escalate to care teams with minimal noise. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Deviation from personal baseline | Robust z-score over 14 days. Change. | Leakage risk to design against: Window excludes current reading. |
| A signal-versus-noise trap in this use case: Baseline | The true signal is per-patient adaptive baselines; the common noise is population thresholds. | Normal differs widely between patients. |

**Ask the experts**

- [ ] What exactly does "Personal baselines" mean in practice for remote patient monitoring anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Deviation from personal baseline" and "Trend slope over 3 days", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Avoided admissions" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: alerts judged only by acted-upon ones, and who can confirm the cut-off times and splits?
- [ ] How often does "Faulty scale readings" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Wearable | A body-worn sensor, such as a watch, that records heart rate, movement or sleep. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| Medication adherence | Whether patients take medicines as prescribed. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Robust z-score | A deviation measure using the median and median absolute deviation, which outliers do not distort. |
| Stationarity | A series whose statistical properties do not change over time. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
