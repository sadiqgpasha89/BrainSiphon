# Safety Stock & Service-Level Optimisation: data and feature specification

> Generated from the blueprint `supply-chain/safety-stock-and-service-level-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Safety Stock & Service-Level Optimisation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Safety Stock & Service-Level Optimisation": Allocate a working-capital budget to safety stock across SKUs to maximise overall service level. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Normality assumed.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Demand over lead time distribution | simulated convolution | Buffer size | Lead-time data |   |   |   |
| Item value and criticality | margin and criticality | Weighting | Master data |   |   |   |
| Forecast bias | mean error of forecasts | Adjustment | Matured |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Allocation | Marginal-return allocation across SKUs | Same service level for all | Uniform service wastes capital on low-value items |
| Distribution | Empirical or fitted non-normal demand-during-lead-time | Normal approximation | Normality fails for intermittent and skewed demand |

## Features to drop

| Feature | Why it is noise |
|---|---|
| SKU description | none |
| Supplier | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Demand over lead time distribution inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: lead-time data. |
| Item value and criticality inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: master data. |
| Forecast bias inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: matured. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: safety_stock_and_service_level_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: demand_over_lead_time_distribution, type: double, nullable: false }
    - { name: item_value_and_criticality, type: double, nullable: false }
    - { name: forecast_bias, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Demand over lead time distribution and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Item value and criticality against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Demand over lead time distribution, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE safety_stock_and_service_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE safety_stock_and_service_outputs (
  run_id TEXT NOT NULL REFERENCES safety_stock_and_service_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE safety_stock_and_service_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE safety_stock_and_service_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Safety Stock & Service-Level Optimisation": Allocate a working-capital budget to safety stock across SKUs to maximise overall service level. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| From forecast error to inventory | Safety stock buffers against forecast error and supplier variability: roughly a service-level factor times the standard deviation of forecast error times the square root of lead time. Better forecasts therefore directly cut the inventory needed for the same service level, and biased forecasts create systematic over- or under-stocking. | Business value is measured in stock, stock-outs and expediting, not in MAPE, so tie accuracy gains back to those. |
| Planner overrides and forecast value added | Experienced planners change statistical forecasts when they know about deals, disruptions or launches. Forecast value added (FVA) measures whether each step, including the model and the human override, improved on a naive baseline. | Adoption depends on respecting overrides, recording them and showing, with data, when they help and when they hurt. |
| Horizons, lag and who uses the forecast | Demand planning produces forecasts for months or weeks ahead for budgeting and capacity; demand sensing produces 1 to 14 day forecasts that drive replenishment, expediting and allocation. Accuracy is measured at a lag: how far in advance the forecast was frozen before the day it predicts. | A model that wins at 14 days can be useless at 2 days. Report accuracy per horizon and judge it against the decision that horizon supports. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Demand over lead time distribution | Simulated convolution. Buffer size. | Leakage risk to design against: Lead-time data. |
| A signal-versus-noise trap in this use case: Allocation | The true signal is marginal-return allocation across SKUs; the common noise is same service level for all. | Uniform service wastes capital on low-value items. |

**Ask the experts**

- [ ] What exactly does "Budget cap" mean in practice for safety stock & service-level optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Demand over lead time distribution" and "Item value and criticality", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fill rate at equal inventory" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: normality assumed, and who can confirm the cut-off times and splits?
- [ ] How often does "Item with few demand observations" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| Bias | The tendency to forecast systematically too high or too low, measured separately from absolute error. |
| Intermittent demand | Series with many zero-sales days and occasional spikes, common for slow-moving items and hard to forecast. |
| Service level | The probability of not stocking out, or the share of demand met from stock. |
| Lead-time variability | How much the time to receive goods varies, which drives safety stock. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Alert budget | The number of alerts a team can handle per period, which sets the detection threshold. |
