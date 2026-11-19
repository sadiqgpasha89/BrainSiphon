# Wearable Arrhythmia Detection (ECG/PPG): data and feature specification

> Generated from the blueprint `healthcare/wearable-arrhythmia-detection-ecg` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wearable Arrhythmia Detection (ECG/PPG) · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Wearable Arrhythmia Detection (ECG/PPG)": Detect atrial fibrillation and other arrhythmias from wearable signals continuously while limiting false alarms and battery drain. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test data from clean lab recordings.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| RR-interval irregularity | beat-to-beat interval entropy | AF marker | Peak detection quality |   |   |   |
| PPG morphology quality | pulse waveform SQI | Reliability | Device-specific calibration |   |   |   |
| Activity context | accelerometer-derived motion level | Artefact control | Sync with signal |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Signal quality | Signal-quality gating before classification | Classifying everything | Motion corrupts PPG and creates false AF |
| Burden | Episode-level detection with duration criteria | Window-level accuracy | Window metrics overcount short events |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Absolute heart rate | wide benign range |
| Wrist side | device artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| RR-interval irregularity inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: peak detection quality. |
| PPG morphology quality inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: device-specific calibration. |
| Activity context inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: sync with signal. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: wearable_arrhythmia_detection_ecg_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: rr_interval_irregularity, type: double, nullable: false }
    - { name: ppg_morphology_quality, type: double, nullable: false }
    - { name: activity_context, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on RR-interval irregularity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for PPG morphology quality against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as RR-interval irregularity, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Numenta Anomaly Benchmark (NAB) | https://github.com/numenta/NAB | AGPL-3.0 (see the repository) | 58 labelled real and synthetic time series for streaming anomaly detection with a scoring scheme | Small and labels are debated. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE wearable_arrhythmia_detection_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  rr_interval_irregularity           DOUBLE PRECISION,
  ppg_morphology_quality             DOUBLE PRECISION,
  activity_context                   DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE wearable_arrhythmia_detection_decisions (
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
CREATE TABLE wearable_arrhythmia_detection_labels (
  decision_id    UUID        NOT NULL REFERENCES wearable_arrhythmia_detection_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Wearable Arrhythmia Detection (ECG/PPG)": Detect atrial fibrillation and other arrhythmias from wearable signals continuously while limiting false alarms and battery drain. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: RR-interval irregularity | Beat-to-beat interval entropy. AF marker. | Leakage risk to design against: Peak detection quality. |
| A signal-versus-noise trap in this use case: Signal quality | The true signal is signal-quality gating before classification; the common noise is classifying everything. | Motion corrupts PPG and creates false AF. |

**Ask the experts**

- [ ] What exactly does "On-device inference under 1 mW budget" mean in practice for wearable arrhythmia detection (ecg/ppg): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "RR-interval irregularity" and "PPG morphology quality", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Confirmed AF detection rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test data from clean lab recordings, and who can confirm the cut-off times and splits?
- [ ] How often does "Tremor or exercise motion" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Wearable | A body-worn sensor, such as a watch, that records heart rate, movement or sleep. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
