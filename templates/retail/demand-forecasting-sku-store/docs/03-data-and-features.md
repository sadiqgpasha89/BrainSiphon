# SKU-Store Demand Forecasting: data and feature specification

> Generated from the blueprint `retail/demand-forecasting-sku-store` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SKU-Store Demand Forecasting · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "SKU-Store Demand Forecasting": Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random CV over time.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Promo calendar flag with depth | promotion type and discount depth known in advance | Demand spike | Only plans known at forecast origin |   |   |   |
| Price index | price relative to base | Elasticity | Future prices must be planned values |   |   |   |
| Lag-7 and lag-364 demand | same weekday and year-ago demand | Seasonality | Alignment by retail calendar |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intermittency | Count-aware or quantile outputs for intermittent demand | Gaussian MSE | MSE on lumpy demand gives meaningless negative or tiny forecasts |
| Hierarchy | Hierarchical reconciliation (SKU, category, store) | Independent forecasts | Independent forecasts do not add up to totals |

## Features to drop

| Feature | Why it is noise |
|---|---|
| SKU description text | adds nothing over category and attributes |
| Day-of-month dummies | spurious for most items |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Promo calendar flag with depth inputs | Merchandise planning | Product information management (SKU and hierarchy master) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: only plans known at forecast origin. |
| Price index inputs | Supply-chain IT | Inventory management and warehouse management (stock and availability) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: future prices must be planned values. |
| Lag-7 and lag-364 demand inputs | Master data team | POS transaction history | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: alignment by retail calendar. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: demand_forecasting_sku_store_inputs.v1
owner: merchandise-planning@example.com
system_of_record: Product information management (SKU and hierarchy master)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: promo_calendar_flag_with_depth, type: double, nullable: false }
    - { name: price_index, type: double, nullable: false }
    - { name: lag_7_and_lag_364_demand, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Promo calendar flag with depth and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Price index against Product information management (SKU and hierarchy master)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Promo calendar flag with depth, traces back to Product information management (SKU and hierarchy master); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE demand_forecasting_sku_store_forecasts (
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
CREATE TABLE demand_forecasting_sku_store_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE demand_forecasting_sku_store_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "SKU-Store Demand Forecasting": Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Inventory, replenishment and assortment | Stores and warehouses hold stock to meet uncertain demand. Replenishment decides when and how much to order, assortment planning decides which items to carry given limited shelf space, and substitution handles out-of-stock moments. Overstock ties up cash and expires; understock loses sales and customers. | Every forecast or recommendation has to respect stock: a perfect recommendation for an unavailable item is a failed one. |
| Price, promotion and demand | Price changes demand (elasticity), promotions pull sales forward or steal them from similar items (cannibalisation), and markdowns clear stock at the end of a season. Forecasts must treat promotions as known inputs, and price decisions as causal questions, not correlations. | Naively learning price from history confuses cause and effect: retailers discount slow items, so low prices correlate with low sales. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Promo calendar flag with depth | Promotion type and discount depth known in advance. Demand spike. | Leakage risk to design against: Only plans known at forecast origin. |
| A signal-versus-noise trap in this use case: Intermittency | The true signal is count-aware or quantile outputs for intermittent demand; the common noise is gaussian MSE. | MSE on lumpy demand gives meaningless negative or tiny forecasts. |

**Ask the experts**

- [ ] What exactly does "5M series nightly" mean in practice for sku-store demand forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Promo calendar flag with depth" and "Price index", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "In-stock rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: random CV over time, and who can confirm the cut-off times and splits?
- [ ] How often does "Stock-out days recorded as zero demand" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| SKU | Stock-keeping unit: one distinct product variant such as a size and colour. |
| Elasticity | How much demand changes for a given change in price. |
| Cannibalisation | A promotion on one item taking sales from a similar item rather than creating new demand. |
| Stock-out | A period when an item is unavailable, so demand is lost or substituted. |
| Shrinkage | Inventory lost to theft, damage or error between purchase and sale. |
| Markdown | A permanent price reduction applied to clear aging or excess stock. |
| Uplift | The additional outcome caused by a treatment such as a coupon, compared with doing nothing. |
| Assortment | The set of products a store or channel chooses to carry. |
| Planogram | A diagram of how products should be arranged on shelves. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Hierarchical forecasting | Forecasting at several levels (item, category, total) that must add up. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
