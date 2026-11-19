# Warehouse Robot Fleet Orchestration: data and feature specification

> Generated from the blueprint `supply-chain/warehouse-robot-fleet-orchestration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Warehouse Robot Fleet Orchestration · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Warehouse Robot Fleet Orchestration": Coordinate hundreds of mobile robots to move shelves and totes without deadlocks while maximising throughput. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training in empty warehouses.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Task-robot assignment cost | travel plus battery cost | Task allocation | Map state |   |   |   |
| Congestion heatmap | robot density per cell | Rerouting | Short windows |   |   |   |
| Battery state-of-charge forecast | time to charge | Availability | Battery model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Safety | Verified safety layer under the learned policy | End-to-end learned control | Learned policies without guarantees can collide |
| Scale | Hierarchical task assignment and local planning | Centralised joint planning | Joint planning explodes with fleet size |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Robot serial number | none |
| Task creator | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Task-robot assignment cost inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: map state. |
| Congestion heatmap inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: short windows. |
| Battery state-of-charge forecast inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: battery model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: warehouse_robot_fleet_orchestration_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: task_robot_assignment_cost, type: double, nullable: false }
    - { name: congestion_heatmap, type: double, nullable: false }
    - { name: battery_state_of_charge_forecast, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Task-robot assignment cost and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Congestion heatmap against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Task-robot assignment cost, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE warehouse_robot_fleet_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE warehouse_robot_fleet_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES warehouse_robot_fleet_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE warehouse_robot_fleet_assignments (
  plan_id TEXT NOT NULL REFERENCES warehouse_robot_fleet_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE warehouse_robot_fleet_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Warehouse Robot Fleet Orchestration": Coordinate hundreds of mobile robots to move shelves and totes without deadlocks while maximising throughput. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Planner overrides and forecast value added | Experienced planners change statistical forecasts when they know about deals, disruptions or launches. Forecast value added (FVA) measures whether each step, including the model and the human override, improved on a naive baseline. | Adoption depends on respecting overrides, recording them and showing, with data, when they help and when they hurt. |
| Warehouse and fulfilment operations | Warehouses receive, store, pick, pack and ship. Layout and slotting set walking distance, wave planning groups orders, robots and humans share space, and labour is the main cost. Computer vision reads barcodes, dimensions and damage. | Throughput and labour per order are the business metrics; model accuracy is only useful insofar as it shortens a pick path or avoids a rehandle. |
| Horizons, lag and who uses the forecast | Demand planning produces forecasts for months or weeks ahead for budgeting and capacity; demand sensing produces 1 to 14 day forecasts that drive replenishment, expediting and allocation. Accuracy is measured at a lag: how far in advance the forecast was frozen before the day it predicts. | A model that wins at 14 days can be useless at 2 days. Report accuracy per horizon and judge it against the decision that horizon supports. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Task-robot assignment cost | Travel plus battery cost. Task allocation. | Leakage risk to design against: Map state. |
| A signal-versus-noise trap in this use case: Safety | The true signal is verified safety layer under the learned policy; the common noise is end-to-end learned control. | Learned policies without guarantees can collide. |

**Ask the experts**

- [ ] What exactly does "Safety-critical collision avoidance" mean in practice for warehouse robot fleet orchestration: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Task-robot assignment cost" and "Congestion heatmap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Orders per hour" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training in empty warehouses, and who can confirm the cut-off times and splits?
- [ ] How often does "Wireless network drop" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| AMR / AGV | Autonomous mobile robot and automated guided vehicle used to move goods in warehouses. |
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Sell-in / sell-out | Sell-in is what a manufacturer ships to retailers; sell-out is what retailers sell to consumers. |
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Policy | The rule that maps a situation to an action. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Heuristic / local search | Fast methods that find good but not provably optimal solutions. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
