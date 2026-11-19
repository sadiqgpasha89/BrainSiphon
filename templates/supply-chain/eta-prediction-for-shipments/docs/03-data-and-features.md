# Shipment ETA Prediction: data and feature specification

> Generated from the blueprint `supply-chain/eta-prediction-for-shipments` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shipment ETA Prediction · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Shipment ETA Prediction": Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating only on delivered shipments.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Hub dwell-time distribution | recent dwell quantiles at the next hub | Biggest delay source | Window before prediction |   |   |   |
| Remaining-leg progress | fraction of leg completed by GPS | Progress | GPS timestamp alignment |   |   |   |
| Weather and disruption on route | alerts in corridor | Delay risk | Known at prediction time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Uncertainty | P50 and P90 ETAs | Single point ETA | A single ETA hides risk and is late half the time |
| Context | Network congestion, weather and dwell at hubs | Distance and average speed | Hub dwell dominates variance |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Shipper name | none |
| Parcel colour | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Hub dwell-time distribution inputs | Supply-chain planning | Transportation management system (TMS) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: window before prediction. |
| Remaining-leg progress inputs | Logistics IT | Warehouse management system (WMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: GPS timestamp alignment. |
| Weather and disruption on route inputs | Master data team | ERP (orders and shipments) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: known at prediction time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: eta_prediction_for_shipments_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: Transportation management system (TMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: hub_dwell_time_distribution, type: double, nullable: false }
    - { name: remaining_leg_progress, type: double, nullable: false }
    - { name: weather_and_disruption_on_route, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Hub dwell-time distribution and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Remaining-leg progress against Transportation management system (TMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Hub dwell-time distribution, traces back to Transportation management system (TMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| NYC Taxi and Limousine Commission trip records (AWS Open Data) | https://registry.opendata.aws/nyc-tlc-trip-records-pds/ | Open data (see the registry page) | Hundreds of millions of trip records with pickup and drop-off times, locations and fares | One city; no driver identities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE eta_prediction_for_shipments_forecasts (
  series_id      TEXT        NOT NULL,
  origin         TIMESTAMPTZ NOT NULL,   -- the as_of the forecast was made at
  target_period  DATE        NOT NULL,
  horizon_step   SMALLINT    NOT NULL,
  p10            REAL        NOT NULL,
  p50            REAL        NOT NULL,
  p90            REAL        NOT NULL,
  model_version  TEXT        NOT NULL,
  is_fallback    BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (series_id, origin, target_period)
) PARTITION BY RANGE (origin);

-- actuals land after the fact; joining on (series_id, target_period) gives forecast error by horizon
CREATE TABLE eta_prediction_for_shipments_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE eta_prediction_for_shipments_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Shipment ETA Prediction": Predict arrival times for in-transit shipments with calibrated uncertainty so customers and planners can act before delays hit. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Estimated time of arrival and delivery promises | ETAs combine routes, traffic, dwell times at stops and historical behaviour. Customers and planners act on them, so under- and over-estimates have different costs, and quantile predictions (a promise at the 90th percentile) are more useful than averages. | A good ETA is calibrated and updates as the shipment moves, not a single early number. |
| Logistics networks: nodes, lanes and the physical flow | Goods move through suppliers, factories, ports, distribution centres, cross-docks and last-mile hubs. Each link has a lead time, a capacity and a cost, and disruptions (weather, strikes, congestion) propagate. Visibility data come from scans, telematics and partner feeds with delays and gaps. | Models sit on top of a physical network with hard constraints; plans must be feasible, not just predicted well. |
| Warehouse and fulfilment operations | Warehouses receive, store, pick, pack and ship. Layout and slotting set walking distance, wave planning groups orders, robots and humans share space, and labour is the main cost. Computer vision reads barcodes, dimensions and damage. | Throughput and labour per order are the business metrics; model accuracy is only useful insofar as it shortens a pick path or avoids a rehandle. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Hub dwell-time distribution | Recent dwell quantiles at the next hub. Biggest delay source. | Leakage risk to design against: Window before prediction. |
| A signal-versus-noise trap in this use case: Uncertainty | The true signal is p50 and P90 ETAs; the common noise is single point ETA. | A single ETA hides risk and is late half the time. |

**Ask the experts**

- [ ] What exactly does "ETA refresh on every scan or ping" mean in practice for shipment eta prediction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Hub dwell-time distribution" and "Remaining-leg progress", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Late-without-notice rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating only on delivered shipments, and who can confirm the cut-off times and splits?
- [ ] How often does "GPS gaps in tunnels or warehouses" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ETA | Estimated time of arrival of a shipment or vehicle. |
| Dwell time | How long a container, truck or parcel waits at a location. |
| DC (distribution centre) | A warehouse that receives goods from suppliers and ships to stores or customers. |
| Telematics | Vehicle sensor and GPS data used to track location, driving and engine health. |
| Cross-docking | Moving goods directly from inbound to outbound vehicles with little or no storage. |
| Last mile | The final leg of delivery from a local hub to the customer's door, the most expensive part. |
| Time window | The interval in which a customer or dock must be served. |
| Slotting | Deciding where in a warehouse each SKU is stored. |
| Wave picking | Releasing batches of orders to pickers together to balance workload and deadlines. |
| Pick path | The route a picker walks to collect items in an order. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Pinball (quantile) loss | A loss that rewards predicting a chosen percentile, used for quantile forecasts. |
| Detection delay | The time between an anomaly starting and the alert being raised. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
