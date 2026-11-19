# Short-Term Demand Sensing: data and feature specification

> Generated from the blueprint `supply-chain/network-demand-sensing-short-term` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Short-Term Demand Sensing · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Short-Term Demand Sensing": Blend point-of-sale, order and external signals into 1-14 day demand forecasts that react to what is actually happening this week. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training with signals that arrive after the forecast time.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Open order book | confirmed orders not yet shipped by SKU | A leading indicator that exists only for the next two weeks | Take the snapshot as it stood at forecast time |   |   |   |
| Sell-through momentum | 7-day vs 28-day velocity ratio | Shows a trend change before monthly averages do | Align calendar days across the two windows |   |   |   |
| External event signal | weather, strikes, promotions known in advance | Explains demand shocks the history cannot | Use the forecast published at the origin, not the observed value |   |   |   |
| Planned promotion flag | whether the target day sits inside a scheduled promotion | Promotions multiply demand and are known weeks ahead | The flag must be the plan as of the origin, not the promotion as finally run |   |   |   |
| Same-weekday history | mean of the last two or three same-weekday sales before the origin | Weekly rhythm dominates short-term demand | Only same weekdays that fall on or before the origin day may be used |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Horizon | Short-horizon model on recent sell-through and open orders | Reusing the monthly statistical forecast | Monthly models ignore this week's signals |
| Reconciliation | Reconcile sensing output with the plan hierarchy | Independent SKU forecasts | Totals disagree with plan and planners distrust it |
| Censoring | Constrained demand flags so allocation-capped sales are not read as demand | Training on raw sales during supply restrictions | The model learns that demand collapsed when stock was simply rationed |
| Evaluation | Error measured at SKU and location level with forecast value added | Aggregate accuracy across the whole network | Aggregate error can be a fifth of SKU error because mistakes cancel out |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Year-over-year growth rate | stale for fast-changing items |
| Planner ID | carries no demand information and only records who last edited the plan |
| Annual growth of the whole category | too slow to matter inside a 14-day horizon and already in the level |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Open order book inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: take the snapshot as it stood at forecast time. |
| Sell-through momentum inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: align calendar days across the two windows. |
| External event signal inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the forecast published at the origin, not the observed value. |
| Planned promotion flag inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: the flag must be the plan as of the origin, not the promotion as finally run. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: network_demand_sensing_short_term_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: open_order_book, type: double, nullable: false }
    - { name: sell_through_momentum, type: double, nullable: false }
    - { name: external_event_signal, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Open order book and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Sell-through momentum against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Open order book, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Kaggle competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions (SNAP and events) and calendar features, plus a hierarchy for reconciliation exercises | Many series are intermittent (lots of zeros) and there are no order-book or weather signals; use it to test the pipeline and metrics, not the sensing features |
| Corporación Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Kaggle competition rules; free Kaggle login | Daily sales for thousands of items across 54 Ecuadorian stores with promotion flags, oil price and holidays, a good test of promotion handling | Includes some missing days that are real stock-outs, which is exactly the censoring problem, but they are not labelled |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Kaggle competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, school holiday and competitor features; small enough to run in minutes | Store-level totals, not SKU level, so it will understate how hard the SKU-level problem is |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE network_demand_sensing_short_forecasts (
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
CREATE TABLE network_demand_sensing_short_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE network_demand_sensing_short_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Horizons, lag and who uses the forecast | Demand planning produces forecasts for months or weeks ahead for budgeting and capacity; demand sensing produces 1 to 14 day forecasts that drive replenishment, expediting and allocation. Accuracy is measured at a lag: how far in advance the forecast was frozen before the day it predicts. | A model that wins at 14 days can be useless at 2 days. Report accuracy per horizon and judge it against the decision that horizon supports. |
| Demand is not sales | Recorded sales are capped by what was available. A stock-out, a supplier allocation limit or a late truck means customers who wanted the product did not get it. The demand that would have occurred without the limit is called unconstrained demand; sales are constrained demand. | Training on capped sales teaches the model that demand fell when supply was rationed, which then under-orders and creates the next stock-out. |
| Signals and when you can know them | Point-of-sale data shows what consumers bought (sell-out), shipments to customers are sell-in, and the order book holds confirmed orders not yet shipped. Promotions, holidays and weather are published in advance with different lock dates. Each signal has a freshness and a cut-off time. | A feature that is only known after the forecast time is leakage. The origin snapshot must contain exactly what planners would have had. |
| Hierarchies and reconciliation | Items roll up into categories and brands, and locations into regions and the network. Forecasts made at different levels disagree, so planners need them reconciled to add up. Accuracy is much better at the top than at SKU-location level, and decisions are made at the bottom. | Aggregate accuracy flatters the model. Evaluate at the level where orders are placed. |
| From forecast error to inventory | Safety stock buffers against forecast error and supplier variability: roughly a service-level factor times the standard deviation of forecast error times the square root of lead time. Better forecasts therefore directly cut the inventory needed for the same service level, and biased forecasts create systematic over- or under-stocking. | Business value is measured in stock, stock-outs and expediting, not in MAPE, so tie accuracy gains back to those. |
| Planner overrides and forecast value added | Experienced planners change statistical forecasts when they know about deals, disruptions or launches. Forecast value added (FVA) measures whether each step, including the model and the human override, improved on a naive baseline. | Adoption depends on respecting overrides, recording them and showing, with data, when they help and when they hurt. |

**Ask the experts**

- [ ] Which decisions use this forecast (replenishment, expediting, allocation) and at which horizon and level of the hierarchy?
- [ ] How are stock-outs and supplier allocation limits flagged in the data, and can we recover constrained days?
- [ ] For each signal, how fresh is it at forecast time: POS delay, order cut-off, promotion calendar lock date?
- [ ] How do planners override forecasts today, are overrides recorded, and which ones have historically added accuracy?
- [ ] How does forecast error translate into safety stock and service level in the current inventory policy?

**Glossary**

| Term | Definition |
|---|---|
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Sell-in / sell-out | Sell-in is what a manufacturer ships to retailers; sell-out is what retailers sell to consumers. |
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| Constrained / unconstrained demand | Sales as limited by supply, versus the demand that would have occurred with unlimited stock. |
| MAPE / WMAPE | Mean absolute percentage error, and its volume-weighted version that stops tiny items dominating the average. |
| Bias | The tendency to forecast systematically too high or too low, measured separately from absolute error. |
| FVA | Forecast value added: improvement in accuracy over a naive baseline attributable to a model or a human step. |
| Hierarchy | The nesting of items, categories, locations and regions at which forecasts and decisions are made. |
| Reconciliation | Adjusting forecasts at different levels so they sum consistently, for example with the MinT method. |
| S&OP | Sales and operations planning: the recurring process that aligns demand, supply and finance. |
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| Intermittent demand | Series with many zero-sales days and occasional spikes, common for slow-moving items and hard to forecast. |
| Promotion uplift | The additional demand caused by a promotion relative to the baseline without it. |
| Cannibalisation | A promotion on one item stealing sales from a similar item rather than adding total demand. |
