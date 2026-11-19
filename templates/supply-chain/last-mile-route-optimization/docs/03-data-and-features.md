# Last-Mile Route Optimisation: data and feature specification

> Generated from the blueprint `supply-chain/last-mile-route-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Last-Mile Route Optimisation · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Last-Mile Route Optimisation": Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Benchmarks with synthetic service times.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Stop service-time model | predicted minutes per stop by building and parcel type | Realistic plan | Historical stop data |   |   |   |
| Travel-time distribution | quantiles per road segment and hour | Reliability | Traffic history |   |   |   |
| Customer time-window flexibility | historical acceptance of window changes | Slack | Preferences |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Inputs | Learned stop service times and travel-time distributions | Fixed average speeds and stop times | Wrong inputs make an optimal solver produce bad routes |
| Objective | Expected lateness and driver fairness | Distance only | Distance-minimal routes miss time windows |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Driver name | handled by capability |
| Parcel ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Stop service-time model inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: historical stop data. |
| Travel-time distribution inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: traffic history. |
| Customer time-window flexibility inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: preferences. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: last_mile_route_optimization_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: stop_service_time_model, type: double, nullable: false }
    - { name: travel_time_distribution, type: double, nullable: false }
    - { name: customer_time_window_flexibility, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Stop service-time model and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Travel-time distribution against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Stop service-time model, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OR-Library | http://people.brunel.ac.uk/~mastjjb/jeb/info.html | Free for research use (see the site) | A collection of operations research test instances: scheduling, packing, location, assignment | Old formats; classic benchmarks only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE last_mile_route_optimization_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE last_mile_route_optimization_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES last_mile_route_optimization_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE last_mile_route_optimization_assignments (
  plan_id TEXT NOT NULL REFERENCES last_mile_route_optimization_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE last_mile_route_optimization_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Last-Mile Route Optimisation": Build daily delivery routes that minimise cost and lateness using learned service times and travel-time distributions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Routing, scheduling and optimisation under uncertainty | Vehicle routing, dispatch, slotting, wave planning, yard planning and timetabling are combinatorial optimisation problems. Travel times, demand and service times are uncertain, so plans built on point predictions are optimistic and fragile. | Optimising predictions systematically picks options whose errors are favourable; robust methods add margins and re-plan as reality unfolds. |
| Signals and when you can know them | Point-of-sale data shows what consumers bought (sell-out), shipments to customers are sell-in, and the order book holds confirmed orders not yet shipped. Promotions, holidays and weather are published in advance with different lock dates. Each signal has a freshness and a cut-off time. | A feature that is only known after the forecast time is leakage. The origin snapshot must contain exactly what planners would have had. |
| From forecast error to inventory | Safety stock buffers against forecast error and supplier variability: roughly a service-level factor times the standard deviation of forecast error times the square root of lead time. Better forecasts therefore directly cut the inventory needed for the same service level, and biased forecasts create systematic over- or under-stocking. | Business value is measured in stock, stock-outs and expediting, not in MAPE, so tie accuracy gains back to those. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Stop service-time model | Predicted minutes per stop by building and parcel type. Realistic plan. | Leakage risk to design against: Historical stop data. |
| A signal-versus-noise trap in this use case: Inputs | The true signal is learned stop service times and travel-time distributions; the common noise is fixed average speeds and stop times. | Wrong inputs make an optimal solver produce bad routes. |

**Ask the experts**

- [ ] What exactly does "Time windows" mean in practice for last-mile route optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Stop service-time model" and "Travel-time distribution", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost per stop" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: benchmarks with synthetic service times, and who can confirm the cut-off times and splits?
- [ ] How often does "Failed deliveries cascade through the route" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| VRP / VRPTW | Vehicle routing problem and its version with customer time windows. |
| Last mile | The final leg of delivery from a local hub to the customer's door, the most expensive part. |
| Proof of delivery | Evidence, often a photo or signature, that a parcel reached the customer. |
| First-attempt delivery rate | The share of parcels delivered successfully on the first try. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Time window | The interval in which a customer or dock must be served. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Policy | The rule that maps a situation to an action. |
| Reward | The number the system tries to maximise over time. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
