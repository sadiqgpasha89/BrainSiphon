# Chronic Kidney Disease Progression Forecasting: data and feature specification

> Generated from the blueprint `healthcare/ckd-progression-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Chronic Kidney Disease Progression Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Chronic Kidney Disease Progression Forecasting": Forecast eGFR trajectories and kidney failure risk to trigger timely nephrology referral and therapy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Informative missingness of labs.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| eGFR slope | linear mixed-model slope over 2 years | Progression speed | Observations before index |   |   |   |
| Albuminuria category | UACR measurement | Strongest risk addition | Latest before index |   |   |   |
| Blood-pressure control | fraction of readings in target | Modifiable | Outpatient only |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Equation | Race-free eGFR equations and consistent assay units | Mixing legacy equations | Inconsistent eGFR definitions create artificial drops |
| Dynamics | Joint longitudinal and survival model | Separate models | Informative dropout biases separate models |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Insurance type | proxy |
| Lab ordering clinic | artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| eGFR slope inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: observations before index. |
| Albuminuria category inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: latest before index. |
| Blood-pressure control inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: outpatient only. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ckd_progression_forecasting_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: egfr_slope, type: double, nullable: false }
    - { name: albuminuria_category, type: double, nullable: false }
    - { name: blood_pressure_control, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on eGFR slope and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Albuminuria category against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as eGFR slope, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Predict Students' Dropout and Academic Success | https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success | CC BY 4.0 (see the UCI page) | 4,400 students with enrolment and early-performance features and a dropout label | One institution; small. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PhysioNet / Computing in Cardiology Challenge 2019: Early Prediction of Sepsis | https://physionet.org/content/challenge-2019/1.0.0/ | CC BY 4.0 (see the page) | Hourly vitals, labs and a sepsis label for about 40,000 ICU patients | Labels are rule-derived and the two hospital systems differ in sampling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE ckd_progression_forecasting_forecasts (
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
CREATE TABLE ckd_progression_forecasting_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE ckd_progression_forecasting_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Chronic Kidney Disease Progression Forecasting": Forecast eGFR trajectories and kidney failure risk to trigger timely nephrology referral and therapy. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Definitions: Sepsis-3, SIRS and qSOFA | Sepsis-3 defines sepsis as suspected infection plus an acute rise of 2 or more points in the SOFA organ-failure score, and septic shock as sepsis that needs vasopressors to keep blood pressure up and has lactate above 2 mmol/L despite fluids. Older screening tools are still used: SIRS (two of abnormal temperature, heart rate, breathing rate or white cell count) and qSOFA (fast breathing, low systolic pressure, altered mentation). | Which definition you label with changes prevalence, onset time and what the model learns, so pick it with clinicians and write it down. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: eGFR slope | Linear mixed-model slope over 2 years. Progression speed. | Leakage risk to design against: Observations before index. |
| A signal-versus-noise trap in this use case: Equation | The true signal is race-free eGFR equations and consistent assay units; the common noise is mixing legacy equations. | Inconsistent eGFR definitions create artificial drops. |

**Ask the experts**

- [ ] What exactly does "Irregular labs" mean in practice for chronic kidney disease progression forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "eGFR slope" and "Albuminuria category", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Timely referrals" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: informative missingness of labs, and who can confirm the cut-off times and splits?
- [ ] How often does "Lab assay change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Blood culture | A lab test that grows bacteria from a blood sample; taken when infection is suspected and results take days. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
