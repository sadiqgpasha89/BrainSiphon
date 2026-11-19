# Building Material Demand & Procurement Forecast: data and feature specification

> Generated from the blueprint `real-estate/building-material-demand-and-procurement-forecast` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Building Material Demand & Procurement Forecast · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Building Material Demand & Procurement Forecast": Forecast material needs by project phase and plan purchases to avoid delays and excess stock. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Plans differ from as-built quantities, so a forecast fitted to plans is biased.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Schedule phase | tasks planned in each of the next 8 weeks mapped to material take-offs | The main driver of demand | Schedules slip, so refresh weekly |   |   |   |
| Supplier lead time | median and 90th percentile days from order to delivery for each supplier | Determines the order date | Quoted lead times differ from realised ones |   |   |   |
| Price index | recent change in the relevant material price index | Informs timing of purchases | Indices lag spot prices |   |   |   |
| Waste factor | percentage of material wasted in past projects of the same type | Converts net quantity into order quantity | Varies by crew and site, so use site-level values |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Phase | Demand forecast by construction phase and task | An average monthly consumption | Demand is lumpy, with concrete in the early phases and finishes at the end |
| Lead | Supplier lead-time risk in the order date | Ordering when the schedule says so | A late delivery stops work, so orders must allow for the real lead time |
| Price | Price volatility and index changes | Fixed price assumptions | Costs move, and locking in at the right time saves money |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Project name | A label with no demand information |
| Supplier name | The supplier's identity is captured by lead time and price already |
| Order number | An administrative identifier with no signal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Schedule phase inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: schedules slip, so refresh weekly. |
| Supplier lead time inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: quoted lead times differ from realised ones. |
| Price index inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: indices lag spot prices. |
| Waste factor inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: varies by crew and site, so use site-level values. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: building_material_demand_and_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: schedule_phase, type: double, nullable: false }
    - { name: supplier_lead_time, type: double, nullable: false }
    - { name: price_index, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Schedule phase and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Supplier lead time against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Schedule phase, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE building_material_demand_and_forecasts (
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
CREATE TABLE building_material_demand_and_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE building_material_demand_and_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Building Material Demand & Procurement Forecast": Forecast material needs by project phase and plan purchases to avoid delays and excess stock. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Schedule phase | Tasks planned in each of the next 8 weeks mapped to material take-offs. The main driver of demand. | Leakage risk to design against: Schedules slip, so refresh weekly. |
| A signal-versus-noise trap in this use case: Phase | The true signal is demand forecast by construction phase and task; the common noise is an average monthly consumption. | Demand is lumpy, with concrete in the early phases and finishes at the end. |

**Ask the experts**

- [ ] What exactly does "Lead times of each supplier are respected in the order plan" mean in practice for building material demand & procurement forecast: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Schedule phase" and "Supplier lead time", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Delays from materials" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: plans differ from as-built quantities, so a forecast fitted to plans is biased, and who can confirm the cut-off times and splits?
- [ ] How often does "Design change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Bill of quantities | A list of materials and work items with quantities, used for tender and cost control. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Days on market | The number of days a listing takes to go under contract. |
| BIM | Building information model: a digital 3D model of a building with data on every element. |
| Critical path | The longest chain of dependent tasks, which determines the project's earliest completion date. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Huber loss | A regression loss that is gentle on large errors, limiting the effect of outliers. |
| Distribution shift | A change in the data a model sees compared with training. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
