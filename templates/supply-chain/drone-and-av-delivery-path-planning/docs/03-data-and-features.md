# Drone & Autonomous Vehicle Delivery Planning: data and feature specification

> Generated from the blueprint `supply-chain/drone-and-av-delivery-path-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Drone & Autonomous Vehicle Delivery Planning · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Drone & Autonomous Vehicle Delivery Planning": Plan safe, energy-feasible paths for delivery drones and sidewalk robots in dynamic environments with regulatory constraints. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Simulation without realistic wind.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Wind and weather forecast | forecast along path | Energy and safety | Forecast |   |   |   |
| Obstacle map confidence | perception uncertainty | Collision risk | Calibration |   |   |   |
| Battery state and reserve | remaining energy vs plan | Feasibility | Battery model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Safety | Verified safety layer over learned planner | Pure learned navigation | Learned planners lack guarantees |
| Energy | Wind-aware energy model | Distance-based range | Wind can halve range |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Package colour | none |
| Customer ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Wind and weather forecast inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: forecast. |
| Obstacle map confidence inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibration. |
| Battery state and reserve inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: battery model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: drone_and_av_delivery_path_planning_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: wind_and_weather_forecast, type: double, nullable: false }
    - { name: obstacle_map_confidence, type: double, nullable: false }
    - { name: battery_state_and_reserve, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Wind and weather forecast and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Obstacle map confidence against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Wind and weather forecast, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CVRPLIB (vehicle routing benchmarks) | http://vrp.galgos.inf.puc-rio.br/ | Per-instance terms (see the site) | Standard capacitated vehicle routing instances with best-known solutions | Benchmarks have static, deterministic costs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE drone_and_av_delivery_path_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE drone_and_av_delivery_path_detections (
  frame_id TEXT NOT NULL REFERENCES drone_and_av_delivery_path_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE drone_and_av_delivery_path_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Drone & Autonomous Vehicle Delivery Planning": Plan safe, energy-feasible paths for delivery drones and sidewalk robots in dynamic environments with regulatory constraints. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| From forecast error to inventory | Safety stock buffers against forecast error and supplier variability: roughly a service-level factor times the standard deviation of forecast error times the square root of lead time. Better forecasts therefore directly cut the inventory needed for the same service level, and biased forecasts create systematic over- or under-stocking. | Business value is measured in stock, stock-outs and expediting, not in MAPE, so tie accuracy gains back to those. |
| Planner overrides and forecast value added | Experienced planners change statistical forecasts when they know about deals, disruptions or launches. Forecast value added (FVA) measures whether each step, including the model and the human override, improved on a naive baseline. | Adoption depends on respecting overrides, recording them and showing, with data, when they help and when they hurt. |
| Routing, scheduling and optimisation under uncertainty | Vehicle routing, dispatch, slotting, wave planning, yard planning and timetabling are combinatorial optimisation problems. Travel times, demand and service times are uncertain, so plans built on point predictions are optimistic and fragile. | Optimising predictions systematically picks options whose errors are favourable; robust methods add margins and re-plan as reality unfolds. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Wind and weather forecast | Forecast along path. Energy and safety. | Leakage risk to design against: Forecast. |
| A signal-versus-noise trap in this use case: Safety | The true signal is verified safety layer over learned planner; the common noise is pure learned navigation. | Learned planners lack guarantees. |

**Ask the experts**

- [ ] What exactly does "Airspace and no-fly rules" mean in practice for drone & autonomous vehicle delivery planning: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Wind and weather forecast" and "Obstacle map confidence", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mission success rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: simulation without realistic wind, and who can confirm the cut-off times and splits?
- [ ] How often does "GPS loss" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Last mile | The final leg of delivery from a local hub to the customer's door, the most expensive part. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Sell-in / sell-out | Sell-in is what a manufacturer ships to retailers; sell-out is what retailers sell to consumers. |
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| Winner's curse | The tendency of an optimiser to pick options whose prediction errors are favourable. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Safe exploration | Trying new actions within limits that prevent harmful outcomes. |
| Off-policy evaluation (OPE) | Estimating how a new policy would perform from data logged under another policy. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Distribution shift | A change in the data a model sees compared with training. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
