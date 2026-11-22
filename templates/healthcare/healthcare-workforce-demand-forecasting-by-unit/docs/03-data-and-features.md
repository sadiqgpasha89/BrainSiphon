# Healthcare Workforce Demand Forecasting by Unit: data and feature specification

> Generated from the blueprint `healthcare/healthcare-workforce-demand-forecasting-by-unit` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Demand Forecasting by Unit · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Workforce Demand Forecasting by Unit": Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on paid hours that reflect past shortages.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Acuity-weighted workload | sum of acuity scores times expected hours of care per patient-day | Workload, not headcount, drives the staff a unit needs | Use the acuity score as charted at forecast time |   |   |   |
| Planned procedure load | scheduled cases by service line and day with historical conversion to inpatient stays | Elective volume is the most predictable driver of inpatient demand weeks ahead | Use the schedule snapshot as it stood at forecast time, not the cases that finally happened |   |   |   |
| Admission and discharge rhythm | day-of-week and hour-of-day arrival and discharge profile per unit | Staffing demand follows patient flow within the day | Compute from event time not from the processing time of the feed |   |   |   |
| Holiday and event calendar | distance to the nearest holiday and local event windows | Demand and cover both shift around holidays | Only calendars published before the forecast date |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Target | Worked hours required by acuity-weighted workload per unit and shift | Scheduled hours or paid hours as the label | Scheduled hours encode past understaffing and past overstaffing as if they were demand |
| Hierarchy | Unit forecasts reconciled to facility and system totals | Independent forecasts per unit that disagree with the facility total | Finance and operations then each trust a different number |
| Minimum coverage | Policy minimum applied after the forecast as a deterministic floor | Letting the model learn the minimum from history | The model hides a legal floor inside a statistical average |
| Census | Forecast census and planned-procedure load as exogenous drivers | Same-day actual census used when training the 7-day-ahead model | Actuals are unknown at forecast time and inflate offline accuracy |
| Intervals | Calibrated 80 and 95 percent intervals per horizon | Point forecast only | A manager cannot size contingency cover without knowing the spread |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Paid hours including overtime | reflects past shortage decisions and not the demand that caused them |
| Individual employee attributes | demand is a property of the unit and shift and personal data adds privacy risk without signal |
| Same-day census revisions | arrive after the planning cut-off and leak the answer |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Acuity-weighted workload inputs | Nursing and clinical workforce planning | Workforce management and scheduling system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the acuity score as charted at forecast time. |
| Planned procedure load inputs | Patient flow and capacity management | Patient flow and ADT system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the schedule snapshot as it stood at forecast time, not the cases that finally happened. |
| Admission and discharge rhythm inputs | Finance workforce analytics | Timekeeping and payroll system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: compute from event time not from the processing time of the feed. |
| Holiday and event calendar inputs | HR information systems | Staffing policy and approved-ratio register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: only calendars published before the forecast date. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_workforce_demand_forecasting_inputs.v1
owner: nursing-and-clinical-workforce-planning@example.com
system_of_record: Workforce management and scheduling system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: acuity_weighted_workload, type: double, nullable: false }
    - { name: planned_procedure_load, type: double, nullable: false }
    - { name: admission_and_discharge_rhythm, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Acuity-weighted workload and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Planned procedure load against Workforce management and scheduling system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Acuity-weighted workload, traces back to Workforce management and scheduling system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE healthcare_workforce_demand_forecasts (
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
CREATE TABLE healthcare_workforce_demand_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE healthcare_workforce_demand_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Workforce Demand Forecasting by Unit": Forecast role- and skill-specific staffing demand for every facility, unit and shift so leaders can plan rosters and contingency cover days or weeks ahead instead of discovering shortfalls at shift start. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Acuity-weighted workload | Sum of acuity scores times expected hours of care per patient-day. Workload, not headcount, drives the staff a unit needs. | Leakage risk to design against: Use the acuity score as charted at forecast time. |
| A signal-versus-noise trap in this use case: Target | The true signal is worked hours required by acuity-weighted workload per unit and shift; the common noise is scheduled hours or paid hours as the label. | Scheduled hours encode past understaffing and past overstaffing as if they were demand. |

**Ask the experts**

- [ ] What exactly does "Forecasts 40K unit-shift-role series nightly at hourly, shift, day and week horizons" mean in practice for healthcare workforce demand forecasting by unit: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Acuity-weighted workload" and "Planned procedure load", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fill rate of planned shifts at publication" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on paid hours that reflect past shortages, and who can confirm the cut-off times and splits?
- [ ] How often does "New unit opens or closes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Readmission | A return to hospital shortly after discharge, usually counted within 30 days and tied to quality penalties. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Federated learning | Training a shared model across institutions without moving their data. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
