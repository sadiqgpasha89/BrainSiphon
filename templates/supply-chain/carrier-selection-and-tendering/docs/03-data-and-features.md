# Carrier Selection & Tendering: data and feature specification

> Generated from the blueprint `supply-chain/carrier-selection-and-tendering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Carrier Selection & Tendering · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Carrier Selection & Tendering": Choose which carrier to tender each load to, using acceptance probability, cost and service history to cut failed tenders. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Logs only contain chosen carriers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Carrier acceptance probability | model per carrier-lane-day | Tender success | History |   |   |   |
| Carrier on-time performance | rolling OTP | Service | Matured |   |   |   |
| Capacity signals | carrier posted capacity | Availability | Real-time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Acceptance | Model carrier acceptance probability per load | Following routing guide order | Guide order ignores current capacity |
| Cost | Expected cost including failed-tender fallback | Lowest contracted rate | Rejections trigger expensive spot fallbacks |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Carrier name | encoded in history |
| Load number | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Carrier acceptance probability inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: history. |
| Carrier on-time performance inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: matured. |
| Capacity signals inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: real-time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: carrier_selection_and_tendering_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: carrier_acceptance_probability, type: double, nullable: false }
    - { name: carrier_on_time_performance, type: double, nullable: false }
    - { name: capacity_signals, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Carrier acceptance probability and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Carrier on-time performance against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Carrier acceptance probability, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ETT electricity transformer dataset | https://github.com/zhouhaoyi/ETDataset | CC BY-ND 4.0 (see the repository) | Multivariate transformer temperature and load data used for long-horizon forecasting benchmarks | One asset type. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE carrier_selection_and_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE carrier_selection_and_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES carrier_selection_and_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE carrier_selection_and_assignments (
  plan_id TEXT NOT NULL REFERENCES carrier_selection_and_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE carrier_selection_and_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Carrier Selection & Tendering": Choose which carrier to tender each load to, using acceptance probability, cost and service history to cut failed tenders. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Logistics networks: nodes, lanes and the physical flow | Goods move through suppliers, factories, ports, distribution centres, cross-docks and last-mile hubs. Each link has a lead time, a capacity and a cost, and disruptions (weather, strikes, congestion) propagate. Visibility data come from scans, telematics and partner feeds with delays and gaps. | Models sit on top of a physical network with hard constraints; plans must be feasible, not just predicted well. |
| Signals and when you can know them | Point-of-sale data shows what consumers bought (sell-out), shipments to customers are sell-in, and the order book holds confirmed orders not yet shipped. Promotions, holidays and weather are published in advance with different lock dates. Each signal has a freshness and a cut-off time. | A feature that is only known after the forecast time is leakage. The origin snapshot must contain exactly what planners would have had. |
| Planner overrides and forecast value added | Experienced planners change statistical forecasts when they know about deals, disruptions or launches. Forecast value added (FVA) measures whether each step, including the model and the human override, improved on a naive baseline. | Adoption depends on respecting overrides, recording them and showing, with data, when they help and when they hurt. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Carrier acceptance probability | Model per carrier-lane-day. Tender success. | Leakage risk to design against: History. |
| A signal-versus-noise trap in this use case: Acceptance | The true signal is model carrier acceptance probability per load; the common noise is following routing guide order. | Guide order ignores current capacity. |

**Ask the experts**

- [ ] What exactly does "Contract allocations" mean in practice for carrier selection & tendering: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Carrier acceptance probability" and "Carrier on-time performance", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "First-tender acceptance rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: logs only contain chosen carriers, and who can confirm the cut-off times and splits?
- [ ] How often does "Carrier changes bid behaviour after rate update" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Tender | Offering a shipment to carriers, who accept or reject at a quoted rate. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| Freight rate | The price of moving goods between two points, varying with market and lane. |
| Spot vs contract rate | A one-off market price for a shipment versus a pre-agreed price over a period. |
| Freight invoice audit | Checking carrier invoices against contracted rates and actual shipments. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Regret | The reward lost by not always choosing the best action. |
| Exploration / exploitation | Trying new actions to learn versus using the best known one. |
| Thompson sampling / UCB | Bandit methods that explore in proportion to uncertainty. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
