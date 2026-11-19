# Container Yard Stacking & Crane Planning: data and feature specification

> Generated from the blueprint `supply-chain/container-port-yard-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Container Yard Stacking & Crane Planning · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Container Yard Stacking & Crane Planning": Assign container slots and sequence crane moves to minimise reshuffles and vessel turnaround time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulator with perfect information.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pickup-time prediction | predicted dwell time per container | Stacking order | Consignee history |   |   |   |
| Stack height and exposure | rehandle risk of position | Cost | Yard state |   |   |   |
| Vessel stowage plan | planned load sequence | Constraints | Plan version |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Prediction | Predicted pickup times for stacking | Stack in arrival order | Late-pickup containers block early ones |
| Objective | Rehandles and turnaround jointly | Crane productivity alone | Local crane speed gains cause downstream rehandles |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Container ID | none |
| Shipping line colour | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pickup-time prediction inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: consignee history. |
| Stack height and exposure inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: yard state. |
| Vessel stowage plan inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: plan version. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: container_port_yard_planning_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pickup_time_prediction, type: double, nullable: false }
    - { name: stack_height_and_exposure, type: double, nullable: false }
    - { name: vessel_stowage_plan, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pickup-time prediction and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Stack height and exposure against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pickup-time prediction, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
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
CREATE TABLE container_port_yard_planning_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE container_port_yard_planning_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES container_port_yard_planning_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE container_port_yard_planning_assignments (
  plan_id TEXT NOT NULL REFERENCES container_port_yard_planning_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE container_port_yard_planning_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Container Yard Stacking & Crane Planning": Assign container slots and sequence crane moves to minimise reshuffles and vessel turnaround time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Routing, scheduling and optimisation under uncertainty | Vehicle routing, dispatch, slotting, wave planning, yard planning and timetabling are combinatorial optimisation problems. Travel times, demand and service times are uncertain, so plans built on point predictions are optimistic and fragile. | Optimising predictions systematically picks options whose errors are favourable; robust methods add margins and re-plan as reality unfolds. |
| From forecast error to inventory | Safety stock buffers against forecast error and supplier variability: roughly a service-level factor times the standard deviation of forecast error times the square root of lead time. Better forecasts therefore directly cut the inventory needed for the same service level, and biased forecasts create systematic over- or under-stocking. | Business value is measured in stock, stock-outs and expediting, not in MAPE, so tie accuracy gains back to those. |
| Planner overrides and forecast value added | Experienced planners change statistical forecasts when they know about deals, disruptions or launches. Forecast value added (FVA) measures whether each step, including the model and the human override, improved on a naive baseline. | Adoption depends on respecting overrides, recording them and showing, with data, when they help and when they hurt. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Pickup-time prediction | Predicted dwell time per container. Stacking order. | Leakage risk to design against: Consignee history. |
| A signal-versus-noise trap in this use case: Prediction | The true signal is predicted pickup times for stacking; the common noise is stack in arrival order. | Late-pickup containers block early ones. |

**Ask the experts**

- [ ] What exactly does "Vessel schedules" mean in practice for container yard stacking & crane planning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pickup-time prediction" and "Stack height and exposure", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Vessel turnaround time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: simulator with perfect information, and who can confirm the cut-off times and splits?
- [ ] How often does "Vessel arrives early or late" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Dwell time | How long a container, truck or parcel waits at a location. |
| Container yard | The area of a port or terminal where containers are stacked and moved. |
| Rehandle | An extra move of a container or pallet needed to reach the one underneath. |
| Bin packing | Fitting items into the fewest containers or trucks subject to size and weight. |
| Capacity constraint | A limit on how much can be processed, stored or moved in a period. |
| Changeover / setup | The time and cost of switching a machine from one product to another. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
