# Listing Price Recommendation & Time-to-Sell: data and feature specification

> Generated from the blueprint `real-estate/listing-price-recommendation-and-time-to-sell` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Price Recommendation & Time-to-Sell · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Listing Price Recommendation & Time-to-Sell": Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Withdrawn listings dropped.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Price to value ratio | listing price divided by AVM value | Core driver | AVM error |   |   |   |
| Local inventory | active listings per month of sales | Market speed | Definition |   |   |   |
| Early engagement | views and saves in the first 7 days | Demand signal | Used for updates, not the first price |   |   |   |
| Seasonal index | month factor by market | Timing | Few years of data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Censoring | Unsold listings treated as censored | Dropping withdrawn listings | Dropping unsold listings makes homes look quicker to sell |
| Price position | Listing price relative to the model value | Absolute price | Over-pricing by 5% matters in a fast market |
| Season | Seasonality in demand | Averages | Spring and autumn differ |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Agent photo count | portal behaviour |
| Weekday listed | weak |
| Listing text length | style |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Price to value ratio inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: AVM error. |
| Local inventory inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: definition. |
| Early engagement inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: used for updates, not the first price. |
| Seasonal index inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: few years of data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: listing_price_recommendation_and_time_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: price_to_value_ratio, type: double, nullable: false }
    - { name: local_inventory, type: double, nullable: false }
    - { name: early_engagement, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Price to value ratio and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Local inventory against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Price to value ratio, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| EdNet (Santa tutoring service) | https://github.com/riiid/ednet | CC BY-NC 4.0 per the repository | Interaction logs from more than 780,000 users over two years | Non-commercial licence and very large. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open University Learning Analytics Dataset (OULAD) | https://analyse.kmi.open.ac.uk/open_dataset | CC BY 4.0 (see the page) | Student demographics, VLE click streams and outcomes for 32,000 students | UK distance learning; coarse click aggregation. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE listing_price_recommendation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  price_to_value_ratio               DOUBLE PRECISION,
  local_inventory                    DOUBLE PRECISION,
  early_engagement                   DOUBLE PRECISION,
  seasonal_index                     DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE listing_price_recommendation_decisions (
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
CREATE TABLE listing_price_recommendation_labels (
  decision_id    UUID        NOT NULL REFERENCES listing_price_recommendation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Listing Price Recommendation & Time-to-Sell": Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Seasonality, trend and calendar effects | Most business series repeat daily, weekly and annually, with holidays, promotions and outages on top. Models must separate these from real change, and know which calendar effects are known in advance. | Ignoring seasonality makes a normal Monday look like an incident and hides slow-moving real changes. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Price to value ratio | Listing price divided by AVM value. Core driver. | Leakage risk to design against: AVM error. |
| A signal-versus-noise trap in this use case: Censoring | The true signal is unsold listings treated as censored; the common noise is dropping withdrawn listings. | Dropping unsold listings makes homes look quicker to sell. |

**Ask the experts**

- [ ] What exactly does "Recommendations are advice not valuations" mean in practice for listing price recommendation & time-to-sell: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Price to value ratio" and "Local inventory", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Median days on market" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: withdrawn listings dropped, and who can confirm the cut-off times and splits?
- [ ] How often does "Bidding war" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| AVM | Automated valuation model: software that estimates a property's market value from data instead of an on-site appraisal. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Comparable (comp) | A recent sale of a similar nearby property used to estimate the value of the subject property. |
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Hazard function | The instantaneous risk of the event at time t given it has not yet occurred. |
| Right-censoring | Observation ending before the event happens, so only a lower bound on the time is known. |
| Concordance index | A ranking measure for survival models: the chance the unit that fails first is ranked as riskier. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| MASE | Mean absolute scaled error: error relative to a naive forecast, comparable across series. |
| Seasonal naive forecast | Predicting the value from the same period one season ago. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Forecast horizon | How many steps ahead a forecast looks. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
