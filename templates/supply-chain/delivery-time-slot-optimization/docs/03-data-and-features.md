# Delivery Time-Slot Pricing & Allocation: data and feature specification

> Generated from the blueprint `supply-chain/delivery-time-slot-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Delivery Time-Slot Pricing & Allocation · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Delivery Time-Slot Pricing & Allocation": Offer and price delivery slots at checkout to steer demand toward cheaper-to-serve slots without hurting conversion. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulation uses fixed demand regardless of price.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Marginal insertion cost | extra route time of the new stop | Slot cost | Routes as-of |   |   |   |
| Slot capacity remaining | slots left per window | Scarcity | Real-time |   |   |   |
| Customer slot-choice propensity | choice model probability | Demand | History |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Cost | Marginal route cost of adding a stop | Flat slot pricing | Cost depends on where the existing route is |
| Choice | Customer slot-choice model | Assuming a single preferred slot | Customers trade price vs convenience |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | none |
| Basket ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Marginal insertion cost inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: routes as-of. |
| Slot capacity remaining inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: real-time. |
| Customer slot-choice propensity inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: history. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: delivery_time_slot_optimization_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: marginal_insertion_cost, type: double, nullable: false }
    - { name: slot_capacity_remaining, type: double, nullable: false }
    - { name: customer_slot_choice_propensity, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Marginal insertion cost and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Slot capacity remaining against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Marginal insertion cost, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE delivery_time_slot_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE delivery_time_slot_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES delivery_time_slot_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE delivery_time_slot_assignments (
  plan_id TEXT NOT NULL REFERENCES delivery_time_slot_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE delivery_time_slot_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Delivery Time-Slot Pricing & Allocation": Offer and price delivery slots at checkout to steer demand toward cheaper-to-serve slots without hurting conversion. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Routing, scheduling and optimisation under uncertainty | Vehicle routing, dispatch, slotting, wave planning, yard planning and timetabling are combinatorial optimisation problems. Travel times, demand and service times are uncertain, so plans built on point predictions are optimistic and fragile. | Optimising predictions systematically picks options whose errors are favourable; robust methods add margins and re-plan as reality unfolds. |
| Estimated time of arrival and delivery promises | ETAs combine routes, traffic, dwell times at stops and historical behaviour. Customers and planners act on them, so under- and over-estimates have different costs, and quantile predictions (a promise at the 90th percentile) are more useful than averages. | A good ETA is calibrated and updates as the shipment moves, not a single early number. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Marginal insertion cost | Extra route time of the new stop. Slot cost. | Leakage risk to design against: Routes as-of. |
| A signal-versus-noise trap in this use case: Cost | The true signal is marginal route cost of adding a stop; the common noise is flat slot pricing. | Cost depends on where the existing route is. |

**Ask the experts**

- [ ] What exactly does "Capacity per slot" mean in practice for delivery time-slot pricing & allocation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Marginal insertion cost" and "Slot capacity remaining", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Route cost per delivery" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: simulation uses fixed demand regardless of price, and who can confirm the cut-off times and splits?
- [ ] How often does "Cost estimates stale as routes change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| Last mile | The final leg of delivery from a local hub to the customer's door, the most expensive part. |
| Time window | The interval in which a customer or dock must be served. |
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Cannibalisation | A promotion on one item stealing sales from a similar item rather than adding total demand. |
| ETA | Estimated time of arrival of a shipment or vehicle. |
| Freight rate | The price of moving goods between two points, varying with market and lane. |
| Spot vs contract rate | A one-off market price for a shipment versus a pre-agreed price over a period. |
| Proof of delivery | Evidence, often a photo or signature, that a parcel reached the customer. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| p99 latency | The time within which 99% of requests complete. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
