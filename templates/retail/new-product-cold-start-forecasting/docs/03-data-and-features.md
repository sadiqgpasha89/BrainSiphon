# New Product Cold-Start Forecasting: data and feature specification

> Generated from the blueprint `retail/new-product-cold-start-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** New Product Cold-Start Forecasting · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "New Product Cold-Start Forecasting": Forecast demand for products with no sales history using attributes, images and analogues to set first buys and launch allocation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Analogues drawn from future seasons.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Attribute-image embedding | joint embedding of attributes and images | Similarity to past winners | Embeddings trained on prior seasons only |   |   |   |
| Launch price position | price percentile within category | Demand expectation | Planned launch price |   |   |   |
| First-week velocity | sales in days 1-7 vs analogue velocity | Update signal | Adjust for stock availability |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Analogues | Nearest-neighbour analogue products with similarity weighting | Category averages | Category averages miss the specific style and price point |
| Learning | Rapid Bayesian updating from first-week sales | Waiting for stable history | Early signal reduces buy error substantially |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Supplier name | confounded with quality tiers that attributes cover |
| Internal SKU code | arbitrary |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Attribute-image embedding inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: embeddings trained on prior seasons only. |
| Launch price position inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: planned launch price. |
| First-week velocity inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: adjust for stock availability. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: new_product_cold_start_forecasting_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: attribute_image_embedding, type: double, nullable: false }
    - { name: launch_price_position, type: double, nullable: false }
    - { name: first_week_velocity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Attribute-image embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Launch price position against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Attribute-image embedding, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Rossmann Store Sales | https://www.kaggle.com/c/rossmann-store-sales | Competition rules; free Kaggle login | Daily sales for 1,115 drugstores with promotion, holiday and competitor features | Store-level totals, not SKU level. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE new_product_cold_start_forecasts (
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
CREATE TABLE new_product_cold_start_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE new_product_cold_start_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "New Product Cold-Start Forecasting": Forecast demand for products with no sales history using attributes, images and analogues to set first buys and launch allocation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Inventory, replenishment and assortment | Stores and warehouses hold stock to meet uncertain demand. Replenishment decides when and how much to order, assortment planning decides which items to carry given limited shelf space, and substitution handles out-of-stock moments. Overstock ties up cash and expires; understock loses sales and customers. | Every forecast or recommendation has to respect stock: a perfect recommendation for an unavailable item is a failed one. |
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Price, promotion and demand | Price changes demand (elasticity), promotions pull sales forward or steal them from similar items (cannibalisation), and markdowns clear stock at the end of a season. Forecasts must treat promotions as known inputs, and price decisions as causal questions, not correlations. | Naively learning price from history confuses cause and effect: retailers discount slow items, so low prices correlate with low sales. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Attribute-image embedding | Joint embedding of attributes and images. Similarity to past winners. | Leakage risk to design against: Embeddings trained on prior seasons only. |
| A signal-versus-noise trap in this use case: Analogues | The true signal is nearest-neighbour analogue products with similarity weighting; the common noise is category averages. | Category averages miss the specific style and price point. |

**Ask the experts**

- [ ] What exactly does "Buy decisions months ahead" mean in practice for new product cold-start forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Attribute-image embedding" and "Launch price position", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "First-buy accuracy" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: analogues drawn from future seasons, and who can confirm the cut-off times and splits?
- [ ] How often does "Viral social trend for a product" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cold start | A new item or visitor with no history to learn from. |
| Attribute extraction | Pulling structured fields such as brand, size and colour from product titles, descriptions and images. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Coverage | The share of the catalogue that is ever recommended, a guard against popularity machines. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| SKU | Stock-keeping unit: one distinct product variant such as a size and colour. |
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| Stock-out | A period when an item is unavailable, so demand is lost or substituted. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Intermittent demand | A series with many zeros and occasional spikes, such as slow-moving items. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Rolling-origin evaluation | Testing a forecaster at many successive origins, each using only earlier data. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Distribution shift | A change in the data a model sees compared with training. |
