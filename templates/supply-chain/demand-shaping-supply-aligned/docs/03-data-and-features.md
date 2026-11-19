# Supply-Aligned Demand Shaping: data and feature specification

> Generated from the blueprint `supply-chain/demand-shaping-supply-aligned` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supply-Aligned Demand Shaping · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Supply-Aligned Demand Shaping": Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Promo uplift from non-randomised data.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Supply availability forecast | projected availability by week | Constraint | Supplier commitments |   |   |   |
| Promo uplift estimate | causal effect | Lever | Randomised tests |   |   |   |
| Cross-item substitution | demand transfer matrix | Side effects | Estimated |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Coupling | Joint demand and supply decisions | Independent promo and supply planning | Promotions that ignore supply cause stock-outs |
| Causality | Causal promo uplift per item | Correlation of promo and sales | Promotions target already-popular items |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Promo ID | none |
| Store manager | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Supply availability forecast inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: supplier commitments. |
| Promo uplift estimate inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: randomised tests. |
| Cross-item substitution inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: estimated. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: demand_shaping_supply_aligned_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: supply_availability_forecast, type: double, nullable: false }
    - { name: promo_uplift_estimate, type: double, nullable: false }
    - { name: cross_item_substitution, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Supply availability forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Promo uplift estimate against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Supply availability forecast, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE demand_shaping_supply_aligned_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE demand_shaping_supply_aligned_outputs (
  run_id TEXT NOT NULL REFERENCES demand_shaping_supply_aligned_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE demand_shaping_supply_aligned_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE demand_shaping_supply_aligned_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Supply-Aligned Demand Shaping": Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Demand is not sales | Recorded sales are capped by what was available. A stock-out, a supplier allocation limit or a late truck means customers who wanted the product did not get it. The demand that would have occurred without the limit is called unconstrained demand; sales are constrained demand. | Training on capped sales teaches the model that demand fell when supply was rationed, which then under-orders and creates the next stock-out. |
| Horizons, lag and who uses the forecast | Demand planning produces forecasts for months or weeks ahead for budgeting and capacity; demand sensing produces 1 to 14 day forecasts that drive replenishment, expediting and allocation. Accuracy is measured at a lag: how far in advance the forecast was frozen before the day it predicts. | A model that wins at 14 days can be useless at 2 days. Report accuracy per horizon and judge it against the decision that horizon supports. |
| Signals and when you can know them | Point-of-sale data shows what consumers bought (sell-out), shipments to customers are sell-in, and the order book holds confirmed orders not yet shipped. Promotions, holidays and weather are published in advance with different lock dates. Each signal has a freshness and a cut-off time. | A feature that is only known after the forecast time is leakage. The origin snapshot must contain exactly what planners would have had. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Supply availability forecast | Projected availability by week. Constraint. | Leakage risk to design against: Supplier commitments. |
| A signal-versus-noise trap in this use case: Coupling | The true signal is joint demand and supply decisions; the common noise is independent promo and supply planning. | Promotions that ignore supply cause stock-outs. |

**Ask the experts**

- [ ] What exactly does "Brand price rules" mean in practice for supply-aligned demand shaping: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Supply availability forecast" and "Promo uplift estimate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Stock-outs during promotions" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: promo uplift from non-randomised data, and who can confirm the cut-off times and splits?
- [ ] How often does "Supply plan slips after promotion is locked" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Promotion uplift | The additional demand caused by a promotion relative to the baseline without it. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Sell-in / sell-out | Sell-in is what a manufacturer ships to retailers; sell-out is what retailers sell to consumers. |
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Reward shaping | Adding extra reward terms to guide learning, which can cause unintended behaviour. |
| Policy | The rule that maps a situation to an action. |
| Doubly robust estimator | An off-policy estimator that combines a reward model with propensity weighting. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
