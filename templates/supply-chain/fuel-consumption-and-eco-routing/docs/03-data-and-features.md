# Fuel Consumption Prediction & Eco-Routing: data and feature specification

> Generated from the blueprint `supply-chain/fuel-consumption-and-eco-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fuel Consumption Prediction & Eco-Routing · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Fuel Consumption Prediction & Eco-Routing": Predict vehicle fuel use per route segment and choose routes and speeds that cut fuel and emissions at acceptable time cost. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on fuel cards with timing error.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Road grade profile | elevation along route | Energy | DEM data |   |   |   |
| Vehicle mass estimate | payload plus tare | Fuel use | Load data |   |   |   |
| Speed profile variance | stop-go intensity | Efficiency | Traffic |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Physics | Vehicle dynamics features (grade, mass, speed profile) | Distance only | Fuel depends strongly on grade and load |
| Trade-off | Cost-optimal route including time cost | Fuel-minimal route | Fuel-minimal routes can break time windows |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Driver age | personal |
| Colour | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Road grade profile inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: DEM data. |
| Vehicle mass estimate inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: load data. |
| Speed profile variance inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: traffic. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: fuel_consumption_and_eco_routing_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: road_grade_profile, type: double, nullable: false }
    - { name: vehicle_mass_estimate, type: double, nullable: false }
    - { name: speed_profile_variance, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Road grade profile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Vehicle mass estimate against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Road grade profile, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Amazon Last Mile Routing Research Challenge | https://registry.opendata.aws/amazon-last-mile-challenges/ | CDLA-Sharing 1.0 (see the registry page) | Real delivery routes with stop sequences and driver behaviour for routing research | US urban routes in 2018; routes only, no demand. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NYC Taxi and Limousine Commission trip records (AWS Open Data) | https://registry.opendata.aws/nyc-tlc-trip-records-pds/ | Open data (see the registry page) | Hundreds of millions of trip records with pickup and drop-off times, locations and fares | One city; no driver identities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Olist Brazilian E-Commerce | https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce | CC BY-NC-SA 4.0 (see the dataset page) | 100K orders with items, payments, reviews, delivery times and seller data | One marketplace and year; useful for delivery, review and seller analyses. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE fuel_consumption_and_eco_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE fuel_consumption_and_eco_outputs (
  run_id TEXT NOT NULL REFERENCES fuel_consumption_and_eco_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE fuel_consumption_and_eco_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE fuel_consumption_and_eco_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Fuel Consumption Prediction & Eco-Routing": Predict vehicle fuel use per route segment and choose routes and speeds that cut fuel and emissions at acceptable time cost. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Sustainability and emissions | Shippers estimate and report carbon emissions per shipment from mode, distance, load factor and fuel. Estimates have wide uncertainty, and routing, mode choice and consolidation can reduce emissions. | Reporting standards require traceable methods, so an estimate must be reproducible from its inputs. |
| Routing, scheduling and optimisation under uncertainty | Vehicle routing, dispatch, slotting, wave planning, yard planning and timetabling are combinatorial optimisation problems. Travel times, demand and service times are uncertain, so plans built on point predictions are optimistic and fragile. | Optimising predictions systematically picks options whose errors are favourable; robust methods add margins and re-plan as reality unfolds. |
| Asset health and predictive maintenance | Vehicles, warehouse equipment and cold-chain units generate sensor data. Failures are rare and costly, the cost of a false alarm is a wasted inspection, and the data are right-censored (assets still running). | Value comes from lead time to act and avoided downtime, so evaluation uses cost-weighted decisions and time-to-failure, not accuracy. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Road grade profile | Elevation along route. Energy. | Leakage risk to design against: DEM data. |
| A signal-versus-noise trap in this use case: Physics | The true signal is vehicle dynamics features (grade, mass, speed profile); the common noise is distance only. | Fuel depends strongly on grade and load. |

**Ask the experts**

- [ ] What exactly does "Time-window feasibility" mean in practice for fuel consumption prediction & eco-routing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Road grade profile" and "Vehicle mass estimate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fuel per delivery" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on fuel cards with timing error, and who can confirm the cut-off times and splits?
- [ ] How often does "Fuel card data misattributed" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Last mile | The final leg of delivery from a local hub to the customer's door, the most expensive part. |
| VRP / VRPTW | Vehicle routing problem and its version with customer time windows. |
| Telematics | Vehicle sensor and GPS data used to track location, driving and engine health. |
| Time window | The interval in which a customer or dock must be served. |
| MAPE / WMAPE | Mean absolute percentage error, and its volume-weighted version that stops tiny items dominating the average. |
| Reconciliation | Adjusting forecasts at different levels so they sum consistently, for example with the MinT method. |
| ETA | Estimated time of arrival of a shipment or vehicle. |
| HS code | Harmonised System code that classifies traded goods for customs duties and rules. |
| Denied-party screening | Checking trading partners against lists of restricted or sanctioned parties. |
| Bin packing | Fitting items into the fewest containers or trucks subject to size and weight. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Hierarchical forecasting | Forecasting at several levels (item, category, total) that must add up. |
| Lag feature | A past value of the series used as a predictor. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
