# Construction Project Delay & Overrun Prediction: data and feature specification

> Generated from the blueprint `real-estate/project-delay-and-overrun-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Construction Project Delay & Overrun Prediction · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Construction Project Delay & Overrun Prediction": Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Only completed projects are in the data, so cancelled or abandoned ones are missing.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Schedule performance index | earned value divided by planned value to date | The standard measure of schedule health | Depends on honest progress reporting, so cross-check with quantities |   |   |   |
| Critical path float | days of float on the tasks that drive the finish date | Low float means any slip delays the project | Schedules are updated irregularly |   |   |   |
| Delivery lateness | average days late of the last ten key deliveries | Supply delays precede site delays | Logs may record receipt and not site-ready dates |   |   |   |
| Weather lost days | days lost to rain or wind against the allowance | Context for delays outside the contractor's control | Weather days are claimed inconsistently |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Earned | Earned value compared with the plan | Percent complete reported by site staff | Self-reported progress is optimistic and lags reality |
| Critical | Delay on tasks on the critical path | Delay on all tasks equally | A late task with float costs nothing, and a late task on the path delays the finish |
| Supply | Material and subcontractor delivery risk | Site conditions only | Late deliveries stop work, and they are visible weeks before the delay |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Project name | A label with no predictive content |
| Manager | Naming a manager risks blame scoring and does not generalise |
| Photo count | A reporting habit and not a measure of progress |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Schedule performance index inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: depends on honest progress reporting, so cross-check with quantities. |
| Critical path float inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: schedules are updated irregularly. |
| Delivery lateness inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: logs may record receipt and not site-ready dates. |
| Weather lost days inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: weather days are claimed inconsistently. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: project_delay_and_overrun_prediction_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: schedule_performance_index, type: double, nullable: false }
    - { name: critical_path_float, type: double, nullable: false }
    - { name: delivery_lateness, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Schedule performance index and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Critical path float against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Schedule performance index, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EPSS data and statistics | https://www.first.org/epss/ | Free to use with attribution (see the page) | Daily exploit prediction scores for all CVEs with historical data | Predicts exploitation probability, which you may want to improve on. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE project_delay_and_overrun_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE project_delay_and_overrun_outputs (
  run_id TEXT NOT NULL REFERENCES project_delay_and_overrun_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE project_delay_and_overrun_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE project_delay_and_overrun_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Construction Project Delay & Overrun Prediction": Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Schedule performance index | Earned value divided by planned value to date. The standard measure of schedule health. | Leakage risk to design against: Depends on honest progress reporting, so cross-check with quantities. |
| A signal-versus-noise trap in this use case: Earned | The true signal is earned value compared with the plan; the common noise is percent complete reported by site staff. | Self-reported progress is optimistic and lags reality. |

**Ask the experts**

- [ ] What exactly does "Forecasts refreshed weekly for every active project" mean in practice for construction project delay & overrun prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Schedule performance index" and "Critical path float", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Overrun days" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: only completed projects are in the data, so cancelled or abandoned ones are missing, and who can confirm the cut-off times and splits?
- [ ] How often does "Change orders" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Critical path | The longest chain of dependent tasks, which determines the project's earliest completion date. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Earned value | A project-control method that compares work completed with the plan and the cost spent. |
| BIM | Building information model: a digital 3D model of a building with data on every element. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| Bill of quantities | A list of materials and work items with quantities, used for tender and cost control. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Permit | Official approval to build, alter or occupy a structure. |
| Escrow | A neutral third party holding money and documents until the conditions of a sale are met. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Lag feature | A past value of the series used as a predictor. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
