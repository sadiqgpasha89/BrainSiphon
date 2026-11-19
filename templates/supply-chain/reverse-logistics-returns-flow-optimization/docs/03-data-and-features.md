# Reverse Logistics Disposition Optimisation: data and feature specification

> Generated from the blueprint `supply-chain/reverse-logistics-returns-flow-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Reverse Logistics Disposition Optimisation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Reverse Logistics Disposition Optimisation": Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Resale prices assumed constant.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Condition grade prediction | grade from images | Disposition | Labelled grades |   |   |   |
| Resale price model | expected resale value by channel | Value | Market data |   |   |   |
| Processing cost by route | labour and shipping cost | Cost | Rate card |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Value | Expected recovery by disposition option | Default restock | Restocking damaged items harms customers |
| Grading | Learned grade prediction from photos and returns reasons | Manual-only grading | Manual grading is slow and inconsistent |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Return reason text length | none |
| Customer name | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Condition grade prediction inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: labelled grades. |
| Resale price model inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: market data. |
| Processing cost by route inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rate card. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: reverse_logistics_returns_flow_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: condition_grade_prediction, type: double, nullable: false }
    - { name: resale_price_model, type: double, nullable: false }
    - { name: processing_cost_by_route, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Condition grade prediction and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Resale price model against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Condition grade prediction, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Online Retail | https://archive.ics.uci.edu/dataset/352/online+retail | CC BY 4.0 (see the UCI page) | About 540K invoices from a UK gift retailer over a year | Single retailer, no sessions; good for RFM, churn and basket work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Avazu Click-Through Rate Prediction | https://www.kaggle.com/c/avazu-ctr-prediction | Competition rules; free Kaggle login | About 40 million mobile ad impressions over 10 days with hourly timestamps | No position or dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE reverse_logistics_returns_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE reverse_logistics_returns_outputs (
  run_id TEXT NOT NULL REFERENCES reverse_logistics_returns_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE reverse_logistics_returns_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE reverse_logistics_returns_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Reverse Logistics Disposition Optimisation": Decide for each returned item whether to restock, refurbish, liquidate, donate or recycle, maximising recovered value. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Logistics networks: nodes, lanes and the physical flow | Goods move through suppliers, factories, ports, distribution centres, cross-docks and last-mile hubs. Each link has a lead time, a capacity and a cost, and disruptions (weather, strikes, congestion) propagate. Visibility data come from scans, telematics and partner feeds with delays and gaps. | Models sit on top of a physical network with hard constraints; plans must be feasible, not just predicted well. |
| Routing, scheduling and optimisation under uncertainty | Vehicle routing, dispatch, slotting, wave planning, yard planning and timetabling are combinatorial optimisation problems. Travel times, demand and service times are uncertain, so plans built on point predictions are optimistic and fragile. | Optimising predictions systematically picks options whose errors are favourable; robust methods add margins and re-plan as reality unfolds. |
| Demand is not sales | Recorded sales are capped by what was available. A stock-out, a supplier allocation limit or a late truck means customers who wanted the product did not get it. The demand that would have occurred without the limit is called unconstrained demand; sales are constrained demand. | Training on capped sales teaches the model that demand fell when supply was rationed, which then under-orders and creates the next stock-out. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Condition grade prediction | Grade from images. Disposition. | Leakage risk to design against: Labelled grades. |
| A signal-versus-noise trap in this use case: Value | The true signal is expected recovery by disposition option; the common noise is default restock. | Restocking damaged items harms customers. |

**Ask the experts**

- [ ] What exactly does "Grading consistency" mean in practice for reverse logistics disposition optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Condition grade prediction" and "Resale price model", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Recovery rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: resale prices assumed constant, and who can confirm the cut-off times and splits?
- [ ] How often does "Safety-recalled products" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Promotion uplift | The additional demand caused by a promotion relative to the baseline without it. |
| Emission factor | The amount of greenhouse gas emitted per unit of activity, such as per tonne-kilometre. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Sell-in / sell-out | Sell-in is what a manufacturer ships to retailers; sell-out is what retailers sell to consumers. |
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| p99 latency | The time within which 99% of requests complete. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Propensity score | The predicted probability that a unit receives a treatment or takes an action. |
