# Sleep Staging from Wearables: data and feature specification

> Generated from the blueprint `healthcare/sleep-staging-from-wearables` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sleep Staging from Wearables · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Sleep Staging from Wearables": Infer sleep stages and sleep quality metrics from wrist/ring sensors with accuracy near PSG for coaching and clinical screening. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Healthy young validation cohort only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Heart-rate variability features | HRV in 30s epochs | Autonomic state | Artifact handling |   |   |   |
| Movement activity counts | accelerometer activity | Wake detection | Sensor placement |   |   |   |
| Circadian time prior | clock time and personal chronotype | Stage priors | Timezone |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Reference | Polysomnography as gold standard | Self-reported sleep | Users misjudge sleep latency and wake time |
| Context | Temporal models over the night | Epoch-wise classifiers | Stages follow typical progression |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Skin temperature absolute | ambient sensitive |
| Step counts during the day | not sleep |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Heart-rate variability features inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: artifact handling. |
| Movement activity counts inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: sensor placement. |
| Circadian time prior inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: timezone. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sleep_staging_from_wearables_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: heart_rate_variability_features, type: double, nullable: false }
    - { name: movement_activity_counts, type: double, nullable: false }
    - { name: circadian_time_prior, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Heart-rate variability features and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Movement activity counts against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Heart-rate variability features, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCR Time Series Archive | https://www.cs.ucr.edu/~eamonn/time_series_data_2018/ | Research use with citation (see the page) | 128 labelled time-series classification datasets | Short curated series. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Heart Disease | https://archive.ics.uci.edu/dataset/45/heart+disease | CC BY 4.0 (see the UCI page) | Small clinical dataset with a heart-disease label | Tiny; use only to test pipeline and calibration code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE sleep_staging_from_wearables_forecasts (
  series_id      TEXT        NOT NULL,
  origin         TIMESTAMPTZ NOT NULL,   -- the as_of the forecast was made at
  target_period  DATE        NOT NULL,
  horizon_step   SMALLINT    NOT NULL,
  p10            REAL        NOT NULL,
  p50            REAL        NOT NULL,
  p90            REAL        NOT NULL,
  model_version  TEXT        NOT NULL,
  is_fallback    BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (series_id, origin, target_period)
) PARTITION BY RANGE (origin);

-- actuals land after the fact; joining on (series_id, target_period) gives forecast error by horizon
CREATE TABLE sleep_staging_from_wearables_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE sleep_staging_from_wearables_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Sleep Staging from Wearables": Infer sleep stages and sleep quality metrics from wrist/ring sensors with accuracy near PSG for coaching and clinical screening. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Heart-rate variability features | HRV in 30s epochs. Autonomic state. | Leakage risk to design against: Artifact handling. |
| A signal-versus-noise trap in this use case: Reference | The true signal is polysomnography as gold standard; the common noise is self-reported sleep. | Users misjudge sleep latency and wake time. |

**Ask the experts**

- [ ] What exactly does "Battery-limited sampling" mean in practice for sleep staging from wearables: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Heart-rate variability features" and "Movement activity counts", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Weekly active users" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: healthy young validation cohort only, and who can confirm the cut-off times and splits?
- [ ] How often does "Shift workers with irregular sleep" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Wearable | A body-worn sensor, such as a watch, that records heart rate, movement or sleep. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Dermatology / dermoscopy | Skin medicine and the imaging of skin lesions with a dermatoscope. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| Prevalence | How common a condition is in the population, which determines how useful a positive result is. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Level shift | An abrupt, lasting change in a series' average. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
