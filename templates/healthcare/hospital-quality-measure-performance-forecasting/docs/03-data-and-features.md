# Hospital Quality Measure Performance Forecasting: data and feature specification

> Generated from the blueprint `healthcare/hospital-quality-measure-performance-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Hospital Quality Measure Performance Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Hospital Quality Measure Performance Forecasting": Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Backtesting on final data without reporting lag.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Risk-adjusted rate trend | rolling observed to expected ratio with case-mix adjustment | The fair comparator across units | Use the final adjusted data |   |   |   |
| Denominator drift | change in volume and exclusion share over time | Explains apparent rate changes | Use closed periods |   |   |   |
| Process-measure lead indicator | compliance with the care process that drives the outcome | Leads the outcome by weeks | Same definition as the process measure |   |   |   |
| Reporting completeness | share of expected records present at the cut-off | Controls for lag | Compute at each historical cut-off |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Definition | Versioned measure specification with exclusions | Home-made approximation of the measure | A forecast of the wrong measure is worse than none |
| Denominator | Validated denominator and case mix | Raw event counts | Low volume and mix shifts dominate the rate |
| Latency | Reporting lag modelled so recent months are completed estimates | Treating incomplete recent months as final | The latest point looks better than it is |
| Uncertainty | Intervals sized to the denominator | A point rate | A unit with 12 cases cannot be ranked by a point rate |
| Action | Scenarios linked to improvement levers | A red-amber-green status | Leaders need to know what would change the outcome |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Single-month spikes in small units | statistical noise |
| Unvalidated manual counts | inconsistent and unauditable |
| Provider names | unfair and not a system driver |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Risk-adjusted rate trend inputs | Quality and patient safety | Quality and performance reporting system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the final adjusted data. |
| Denominator drift inputs | Clinical informatics | Enterprise data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use closed periods. |
| Process-measure lead indicator inputs | Finance | Measure specification library | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: same definition as the process measure. |
| Reporting completeness inputs | Health information management | EHR and claims-derived numerator and denominator data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: compute at each historical cut-off. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: hospital_quality_measure_performance_inputs.v1
owner: quality-and-patient-safety@example.com
system_of_record: Quality and performance reporting system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: risk_adjusted_rate_trend, type: double, nullable: false }
    - { name: denominator_drift, type: double, nullable: false }
    - { name: process_measure_lead_indicator, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Risk-adjusted rate trend and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Denominator drift against Quality and performance reporting system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Risk-adjusted rate trend, traces back to Quality and performance reporting system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE hospital_quality_measure_forecasts (
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
CREATE TABLE hospital_quality_measure_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE hospital_quality_measure_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Hospital Quality Measure Performance Forecasting": Forecast quality measure outcomes and identify the facilities and units likely to miss internal or external performance targets early enough for improvement work to change the result. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Chart time, draw time and result time | A lab has an order time, a collection (draw) time and a result time, often an hour or more apart; vitals have a measurement time and a charting time. A feature may use a value only once clinicians could have seen it. | Using draw time instead of result time gives the model information the ward never had, so offline lead time looks better than real life. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Risk-adjusted rate trend | Rolling observed to expected ratio with case-mix adjustment. The fair comparator across units. | Leakage risk to design against: Use the final adjusted data. |
| A signal-versus-noise trap in this use case: Definition | The true signal is versioned measure specification with exclusions; the common noise is home-made approximation of the measure. | A forecast of the wrong measure is worse than none. |

**Ask the experts**

- [ ] What exactly does "Forecasts 8K measure-by-unit series monthly and weekly where volume allows" mean in practice for hospital quality measure performance forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Risk-adjusted rate trend" and "Denominator drift", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Share of measures reaching target" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: backtesting on final data without reporting lag, and who can confirm the cut-off times and splits?
- [ ] How often does "Measure specification changes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Readmission | A return to hospital shortly after discharge, usually counted within 30 days and tied to quality penalties. |
| eGFR | Estimated glomerular filtration rate: a kidney function measure that falls as chronic kidney disease progresses. |
| Chronic kidney disease (CKD) | Long-term loss of kidney function, tracked in stages by eGFR. |
| Lead time | How many hours before onset an alert fires, the quantity that makes an early-warning system clinically useful. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Single-cell RNA sequencing | A technique that measures gene activity in individual cells, used to identify cell types. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Distribution shift | A change in the data a model sees compared with training. |
| p99 latency | The time within which 99% of requests complete. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| F1 score | The harmonic mean of precision and recall. |
