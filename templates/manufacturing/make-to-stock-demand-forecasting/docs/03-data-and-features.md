# Demand Forecasting for Make-to-Stock Items: data and feature specification

> Generated from the blueprint `manufacturing/make-to-stock-demand-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Demand Forecasting for Make-to-Stock Items · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Demand Forecasting for Make-to-Stock Items": Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using shipments as demand.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Same week last year | demand in the matching week of prior years | Seasonality | Aligned by week number |   |   |   |
| Promotion and launch calendar | planned promotions and launches | Demand shifts | From sales |   |   |   |
| Customer order backlog | confirmed open orders by need date | Near-term demand | From ERP |   |   |   |
| Price and mix changes | list price changes by item | Elasticity | By item family |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Demand | Customer orders and shipments by need date | Production output | Output reflects capacity not demand |
| Hierarchy | Forecasts reconciled from item to family and plant | Independent item forecasts | Totals that disagree break the plan |
| Intermittent | Methods for slow items | Averages | Many items sell once in a while |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Item description length | not demand |
| Planner name | irrelevant |
| Warehouse code | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Same week last year inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: aligned by week number. |
| Promotion and launch calendar inputs | Quality engineering | ERP and production planning | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from sales. |
| Customer order backlog inputs | Reliability and maintenance | CMMS or EAM maintenance system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from ERP. |
| Price and mix changes inputs | Plant operations | MES (manufacturing execution system) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: by item family. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: make_to_stock_demand_forecasting_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: same_week_last_year, type: double, nullable: false }
    - { name: promotion_and_launch_calendar, type: double, nullable: false }
    - { name: customer_order_backlog, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Same week last year and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Promotion and launch calendar against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Same week last year, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE make_to_stock_demand_forecasts (
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
CREATE TABLE make_to_stock_demand_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE make_to_stock_demand_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Demand Forecasting for Make-to-Stock Items": Forecast item-level demand with intervals for make-to-stock products so production plans, safety stock and raw material orders match demand. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Planning and scheduling are constraint problems | Production plans must respect machine capabilities, changeover times, material availability, labour and due dates. Small disruptions force a re-plan. | A forecast alone is not a plan, so models need to feed an optimiser that respects the constraints. |
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Same week last year | Demand in the matching week of prior years. Seasonality. | Leakage risk to design against: Aligned by week number. |
| A signal-versus-noise trap in this use case: Demand | The true signal is customer orders and shipments by need date; the common noise is production output. | Output reflects capacity not demand. |

**Ask the experts**

- [ ] What exactly does "Forecast per item and channel for 26 weeks" mean in practice for demand forecasting for make-to-stock items: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Same week last year" and "Promotion and launch calendar", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Forecast accuracy at item level" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using shipments as demand, and who can confirm the cut-off times and splits?
- [ ] How often does "New item" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| MES | Manufacturing execution system: software that tracks production on the shop floor. |
| Takt time | The pace of production needed to meet demand. |
| Digital twin | A model of a machine or plant kept in step with real data. |
| Batch | A quantity of product made together under the same conditions. |
| Work order | An instruction to produce or repair something. |
| APS | Advanced planning and scheduling software. |
| Kanban | A pull system that signals when to make or move more material. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Hierarchical forecasting | Forecasting at several levels (item, category, total) that must add up. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Distribution shift | A change in the data a model sees compared with training. |
