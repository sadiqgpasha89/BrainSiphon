# House Price Index & Market Trend Forecasting: data and feature specification

> Generated from the blueprint `real-estate/price-index-and-market-trend-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** House Price Index & Market Trend Forecasting · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "House Price Index & Market Trend Forecasting": Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: A back-test run only through a rising market flatters any model that predicts continued growth.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Repeat-sales pairs | log price change between two sales of the same property divided by the years between them | Holds the home constant, so the change is the market and not the mix | Few pairs exist in thin markets, so pool by region and report the count |   |   |   |
| Mortgage rate | average new-loan rate lagged by one to three months | Affordability moves demand with a lag | Use the rate known at the forecast date, not the revised one |   |   |   |
| Active listings | change in unsold inventory over the last quarter, scaled by monthly sales | Supply relative to demand moves prices | Definitions of active differ by portal, so standardise before comparing |   |   |   |
| Search interest | portal search volume for an area, indexed to its own 12-month mean | A leading indicator of demand before sales are recorded | Search volume is noisy and affected by portal changes, so check for breaks in the series |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Quality | A quality-adjusted index that tracks price change for the same home over time | The median sale price of the month | The mix of homes that sell changes, so a median can fall in a month when every home's price rose |
| Lag | Sales dates and recording dates modelled separately, with later revisions published | Listing asking prices alone | Listing prices lead the market but overstate what buyers finally pay, so using them alone biases the index upward |
| Leading | Mortgage rates, active listings and affordability as drivers of turning points | Past prices as the only predictors | A model of past prices can only extrapolate, and misses the turn when rates change |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Social posts | Sentiment volumes swing with news cycles and carry little information about transaction prices |
| Single-sale outliers | One unusual sale such as a family transfer or a distressed deal should not move an area index |
| Agent commentary | Opinion that is not measured and cannot be reproduced |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Repeat-sales pairs inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: few pairs exist in thin markets, so pool by region and report the count. |
| Mortgage rate inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the rate known at the forecast date, not the revised one. |
| Active listings inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: definitions of active differ by portal, so standardise before comparing. |
| Search interest inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: search volume is noisy and affected by portal changes, so check for breaks in the series. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: price_index_and_market_trend_forecasting_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: repeat_sales_pairs, type: double, nullable: false }
    - { name: mortgage_rate, type: double, nullable: false }
    - { name: active_listings, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Repeat-sales pairs and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Mortgage rate against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Repeat-sales pairs, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| M5 Forecasting - Accuracy (Walmart) | https://www.kaggle.com/c/m5-forecasting-accuracy | Competition rules; free Kaggle login | Five years of daily unit sales for about 30,000 item-store series with prices, promotions and calendar events | Intermittent series and no order-book or weather signals. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Corporacion Favorita Grocery Sales Forecasting | https://www.kaggle.com/c/favorita-grocery-sales-forecasting | Competition rules; free Kaggle login | Daily sales for thousands of items across 54 stores with promotions, holidays and oil prices | Real stock-outs are unlabelled. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- one row per series, per forecast origin, per target period: nothing is ever overwritten
CREATE TABLE price_index_and_market_trend_forecasts (
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
CREATE TABLE price_index_and_market_trend_actuals (
  series_id      TEXT        NOT NULL,
  target_period  DATE        NOT NULL,
  actual         REAL        NOT NULL,
  revised_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (series_id, target_period, revised_at)
);

-- accuracy by horizon, segment and origin: the table every monitor reads
CREATE TABLE price_index_and_market_trend_backtest (
  model_version TEXT NOT NULL, origin TIMESTAMPTZ NOT NULL, segment TEXT NOT NULL, horizon_step SMALLINT NOT NULL,
  wape REAL, bias REAL, pinball_p50 REAL, coverage_80 REAL,
  PRIMARY KEY (model_version, origin, segment, horizon_step)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "House Price Index & Market Trend Forecasting": Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Forecasting: horizons, origins and leakage | A forecast is made at an origin for one or more horizons ahead. Evaluation must replay origins in time order and use only information available at each origin; random splits leak the future. Probabilistic forecasts give quantiles, not just a point. | Report accuracy per horizon and against a seasonal or naive baseline, and judge probabilistic forecasts by coverage and pinball loss. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Repeat-sales pairs | Log price change between two sales of the same property divided by the years between them. Holds the home constant, so the change is the market and not the mix. | Leakage risk to design against: Few pairs exist in thin markets, so pool by region and report the count. |
| A signal-versus-noise trap in this use case: Quality | The true signal is a quality-adjusted index that tracks price change for the same home over time; the common noise is the median sale price of the month. | The mix of homes that sell changes, so a median can fall in a month when every home's price rose. |

**Ask the experts**

- [ ] What exactly does "Published on a fixed monthly date with the revision policy stated up front" mean in practice for house price index & market trend forecasting: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Repeat-sales pairs" and "Mortgage rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Users of the index" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: a back-test run only through a rising market flatters any model that predicts continued growth, and who can confirm the cut-off times and splits?
- [ ] How often does "Revisions" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Days on market | The number of days a listing takes to go under contract. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Absorption | The rate at which available space or new units are leased or sold over time. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Occupancy | The share of units or floor area that is leased or in use. |
| Vacancy | Space that is available and unleased, and the share it represents of total space. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Prediction interval coverage | The share of outcomes that fall inside the forecast's stated interval. |
| Stationarity | A series whose statistical properties do not change over time. |
| MAPE / WMAPE / sMAPE | Percentage error measures; WMAPE weights by volume and sMAPE is symmetric. |
| Distribution shift | A change in the data a model sees compared with training. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
