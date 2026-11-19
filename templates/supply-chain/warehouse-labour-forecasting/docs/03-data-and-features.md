# Warehouse Labour Demand Forecasting: data and feature specification

> Generated from the blueprint `supply-chain/warehouse-labour-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Warehouse Labour Demand Forecasting · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Warehouse Labour Demand Forecasting": Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Forecasting hours that were constrained by staffing.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Forecast order lines by type | lines by category | Workload | Forecast |   |   |   |
| Task standard times | engineered times | Conversion | Standards version |   |   |   |
| Staffing experience mix | share of new workers | Productivity | Roster |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Drivers | Convert order forecast to task workload using engineered standards | Time series of hours alone | Hours depend on order mix |
| Productivity | Learned productivity rates by task and experience | Static standards | Productivity shifts with new hires |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Day of month | none |
| Employee ID | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Forecast order lines by type inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: forecast. |
| Task standard times inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: standards version. |
| Staffing experience mix inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: roster. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: warehouse_labour_forecasting_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: forecast_order_lines_by_type, type: double, nullable: false }
    - { name: task_standard_times, type: double, nullable: false }
    - { name: staffing_experience_mix, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Forecast order lines by type and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Task standard times against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Forecast order lines by type, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE warehouse_labour_forecasting_forecasts (
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
CREATE TABLE warehouse_labour_forecasting_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE warehouse_labour_forecasting_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Warehouse Labour Demand Forecasting": Forecast labour hours needed by task and shift from order inflow and process mix to plan staffing and overtime. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Horizons, lag and who uses the forecast | Demand planning produces forecasts for months or weeks ahead for budgeting and capacity; demand sensing produces 1 to 14 day forecasts that drive replenishment, expediting and allocation. Accuracy is measured at a lag: how far in advance the forecast was frozen before the day it predicts. | A model that wins at 14 days can be useless at 2 days. Report accuracy per horizon and judge it against the decision that horizon supports. |
| Demand is not sales | Recorded sales are capped by what was available. A stock-out, a supplier allocation limit or a late truck means customers who wanted the product did not get it. The demand that would have occurred without the limit is called unconstrained demand; sales are constrained demand. | Training on capped sales teaches the model that demand fell when supply was rationed, which then under-orders and creates the next stock-out. |
| Signals and when you can know them | Point-of-sale data shows what consumers bought (sell-out), shipments to customers are sell-in, and the order book holds confirmed orders not yet shipped. Promotions, holidays and weather are published in advance with different lock dates. Each signal has a freshness and a cut-off time. | A feature that is only known after the forecast time is leakage. The origin snapshot must contain exactly what planners would have had. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Forecast order lines by type | Lines by category. Workload. | Leakage risk to design against: Forecast. |
| A signal-versus-noise trap in this use case: Drivers | The true signal is convert order forecast to task workload using engineered standards; the common noise is time series of hours alone. | Hours depend on order mix. |

**Ask the experts**

- [ ] What exactly does "Shift notice rules" mean in practice for warehouse labour demand forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Forecast order lines by type" and "Task standard times", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Overtime percentage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: forecasting hours that were constrained by staffing, and who can confirm the cut-off times and splits?
- [ ] How often does "New automation reduces labour needs" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Constrained / unconstrained demand | Sales as limited by supply, versus the demand that would have occurred with unlimited stock. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Sell-in / sell-out | Sell-in is what a manufacturer ships to retailers; sell-out is what retailers sell to consumers. |
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Distribution shift | A change in the data a model sees compared with training. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
