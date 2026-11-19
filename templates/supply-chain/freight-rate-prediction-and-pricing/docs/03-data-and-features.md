# Freight Rate Prediction & Pricing: data and feature specification

> Generated from the blueprint `supply-chain/freight-rate-prediction-and-pricing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Freight Rate Prediction & Pricing · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Freight Rate Prediction & Pricing": Quote spot and contract freight rates instantly using lane market data, capacity and customer value, balancing win rate and margin. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Won quotes only in training.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lane market index | rolling spot index per lane | Market level | Index lag |   |   |   |
| Capacity tightness | load-to-truck ratio | Price pressure | Real-time |   |   |   |
| Customer price sensitivity | quote-win history | Win curve | Prior |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Market | Lane-level market index and capacity tightness | Own historical rates | Own rates lag the market |
| Win | Win probability curve vs price | Cost-plus pricing | Pricing without demand response leaves money on the table |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Quote ID | none |
| Salesperson name | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lane market index inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: index lag. |
| Capacity tightness inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: real-time. |
| Customer price sensitivity inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: prior. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: freight_rate_prediction_and_pricing_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lane_market_index, type: double, nullable: false }
    - { name: capacity_tightness, type: double, nullable: false }
    - { name: customer_price_sensitivity, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Lane market index and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Capacity tightness against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lane market index, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NYC Taxi and Limousine Commission trip records (AWS Open Data) | https://registry.opendata.aws/nyc-tlc-trip-records-pds/ | Open data (see the registry page) | Hundreds of millions of trip records with pickup and drop-off times, locations and fares | One city; no driver identities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Google cluster data | https://github.com/google/cluster-data | CC BY 4.0 (see the repository) | Production cluster traces with job events, resource usage and failures | Dated; Google-specific scheduling. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE freight_rate_prediction_and_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  lane_market_index                  DOUBLE PRECISION,
  capacity_tightness                 DOUBLE PRECISION,
  customer_price_sensitivity         DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE freight_rate_prediction_and_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE freight_rate_prediction_and_labels (
  decision_id    UUID        NOT NULL REFERENCES freight_rate_prediction_and_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Freight Rate Prediction & Pricing": Quote spot and contract freight rates instantly using lane market data, capacity and customer value, balancing win rate and margin. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Demand is not sales | Recorded sales are capped by what was available. A stock-out, a supplier allocation limit or a late truck means customers who wanted the product did not get it. The demand that would have occurred without the limit is called unconstrained demand; sales are constrained demand. | Training on capped sales teaches the model that demand fell when supply was rationed, which then under-orders and creates the next stock-out. |
| Procurement, suppliers and trade compliance | Buyers choose suppliers, forecast commodity prices, classify spend and negotiate contracts; importers classify goods under customs codes, screen parties against denied lists and audit freight invoices. Supplier failures and sanctions have large downstream cost. | Evidence trails and explainability matter because decisions are audited, and errors can mean fines or shipment holds. |
| Sustainability and emissions | Shippers estimate and report carbon emissions per shipment from mode, distance, load factor and fuel. Estimates have wide uncertainty, and routing, mode choice and consolidation can reduce emissions. | Reporting standards require traceable methods, so an estimate must be reproducible from its inputs. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Lane market index | Rolling spot index per lane. Market level. | Leakage risk to design against: Index lag. |
| A signal-versus-noise trap in this use case: Market | The true signal is lane-level market index and capacity tightness; the common noise is own historical rates. | Own rates lag the market. |

**Ask the experts**

- [ ] What exactly does "Quote in 100 ms" mean in practice for freight rate prediction & pricing: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lane market index" and "Capacity tightness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Margin per load" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: won quotes only in training, and who can confirm the cut-off times and splits?
- [ ] How often does "Hurricane disrupts capacity" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Freight rate | The price of moving goods between two points, varying with market and lane. |
| Spot vs contract rate | A one-off market price for a shipment versus a pre-agreed price over a period. |
| Freight invoice audit | Checking carrier invoices against contracted rates and actual shipments. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Constrained / unconstrained demand | Sales as limited by supply, versus the demand that would have occurred with unlimited stock. |
| MAPE / WMAPE | Mean absolute percentage error, and its volume-weighted version that stops tiny items dominating the average. |
| Tender | Offering a shipment to carriers, who accept or reject at a quoted rate. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Platt scaling | Calibrating scores with a logistic curve. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Lag feature | A past value of the series used as a predictor. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
