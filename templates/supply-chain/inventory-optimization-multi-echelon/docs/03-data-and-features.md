# Multi-Echelon Inventory Optimisation: data and feature specification

> Generated from the blueprint `supply-chain/inventory-optimization-multi-echelon` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Multi-Echelon Inventory Optimisation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Multi-Echelon Inventory Optimisation": Set stocking levels across plants, DCs and stores to hit service targets at minimal total inventory investment. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Normal-distribution assumptions on skewed demand.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Demand forecast error distribution | residuals by horizon | Uncertainty | Forecast backtest |   |   |   |
| Replenishment lead-time distribution | empirical quantiles | Buffer sizing | Delivered times |   |   |   |
| Holding cost and criticality | cost and service class | Trade-off | Finance data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Network | Guaranteed-service or stochastic multi-echelon model | Independent location safety stocks | Independent buffers over-stock the network |
| Variability | Lead-time and forecast-error distributions | Mean-based rules | Variability sets safety stock |

## Features to drop

| Feature | Why it is noise |
|---|---|
| SKU code | none |
| Planner | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Demand forecast error distribution inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: forecast backtest. |
| Replenishment lead-time distribution inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: delivered times. |
| Holding cost and criticality inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: finance data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: inventory_optimization_multi_echelon_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: demand_forecast_error_distribution, type: double, nullable: false }
    - { name: replenishment_lead_time_distribution, type: double, nullable: false }
    - { name: holding_cost_and_criticality, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Demand forecast error distribution and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Replenishment lead-time distribution against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Demand forecast error distribution, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE inventory_optimization_multi_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE inventory_optimization_multi_outputs (
  run_id TEXT NOT NULL REFERENCES inventory_optimization_multi_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE inventory_optimization_multi_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE inventory_optimization_multi_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Multi-Echelon Inventory Optimisation": Set stocking levels across plants, DCs and stores to hit service targets at minimal total inventory investment. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| From forecast error to inventory | Safety stock buffers against forecast error and supplier variability: roughly a service-level factor times the standard deviation of forecast error times the square root of lead time. Better forecasts therefore directly cut the inventory needed for the same service level, and biased forecasts create systematic over- or under-stocking. | Business value is measured in stock, stock-outs and expediting, not in MAPE, so tie accuracy gains back to those. |
| Planner overrides and forecast value added | Experienced planners change statistical forecasts when they know about deals, disruptions or launches. Forecast value added (FVA) measures whether each step, including the model and the human override, improved on a naive baseline. | Adoption depends on respecting overrides, recording them and showing, with data, when they help and when they hurt. |
| Horizons, lag and who uses the forecast | Demand planning produces forecasts for months or weeks ahead for budgeting and capacity; demand sensing produces 1 to 14 day forecasts that drive replenishment, expediting and allocation. Accuracy is measured at a lag: how far in advance the forecast was frozen before the day it predicts. | A model that wins at 14 days can be useless at 2 days. Report accuracy per horizon and judge it against the decision that horizon supports. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Demand forecast error distribution | Residuals by horizon. Uncertainty. | Leakage risk to design against: Forecast backtest. |
| A signal-versus-noise trap in this use case: Network | The true signal is guaranteed-service or stochastic multi-echelon model; the common noise is independent location safety stocks. | Independent buffers over-stock the network. |

**Ask the experts**

- [ ] What exactly does "Lead-time variability" mean in practice for multi-echelon inventory optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Demand forecast error distribution" and "Replenishment lead-time distribution", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Inventory days of supply" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: normal-distribution assumptions on skewed demand, and who can confirm the cut-off times and splits?
- [ ] How often does "Single-sourced component disrupted" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Multi-echelon inventory | Inventory held at several levels of a network, such as factory, regional DC and store. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Bias | The tendency to forecast systematically too high or too low, measured separately from absolute error. |
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| Service level | The probability of not stocking out, or the share of demand met from stock. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Forecast horizon | How many steps ahead a forecast looks. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| Policy | The rule that maps a situation to an action. |
