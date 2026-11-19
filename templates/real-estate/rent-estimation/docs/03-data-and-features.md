# Rental Price Estimation: data and feature specification

> Generated from the blueprint `real-estate/rent-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Rental Price Estimation · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Rental Price Estimation": Estimate the market rent for a home or unit so owners, agents and tenants see a credible range. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Asking rents leak into labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Local median rent per room | trailing 60-day median in the micro-area | Market anchor | Mix of unit types |   |   |   |
| Unit size and layout | area and bedrooms | Core attribute | Floor plan errors |   |   |   |
| Building amenity count | amenities from listings | Premium driver | Text extraction errors |   |   |   |
| Transit access | walking time to stations | Premium driver | Routing data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Asking vs signed | Signed rents when known | Asking rents only | Asking rents are 3-8% above what is signed |
| Furnishing | Furnished versus unfurnished segmentation | Pooled rents | Furnishing shifts rent by 10-20% |
| Amenities | Parking, laundry, pets and utilities included | Bedroom count only | Included utilities change net rent |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Listing title style | marketing |
| Photo count | portal behaviour |
| Agent name | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Local median rent per room inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: mix of unit types. |
| Unit size and layout inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: floor plan errors. |
| Building amenity count inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: text extraction errors. |
| Transit access inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: routing data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: rent_estimation_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: local_median_rent_per_room, type: double, nullable: false }
    - { name: unit_size_and_layout, type: double, nullable: false }
    - { name: building_amenity_count, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Local median rent per room and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Unit size and layout against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Local median rent per room, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| California Housing (scikit-learn) | https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html | BSD-3 code; census-derived data | 20,640 census block groups with median house value, income and location, loaded with one function call | Block-group medians from 1990, not individual homes; values are capped. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Inside Airbnb | https://insideairbnb.com/get-the-data/ | Creative Commons CC0 1.0 for most cities (check each city page) | Listing, calendar and review data for many cities, scraped from public Airbnb pages and refreshed regularly | Scraped, not official; calendar availability does not equal bookings and prices are asking prices. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Ames Housing (De Cock) | https://jse.amstat.org/v19n3/decock.pdf | Published for teaching use; see the paper | 2,930 home sales from Ames, Iowa with 80 attributes, written up in a paper that explains every field and the data-cleaning steps | One mid-sized US city over five years: no photos, no micro-market detail and a single price regime. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE rent_estimation_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  local_median_rent_per_room         DOUBLE PRECISION,
  unit_size_and_layout               DOUBLE PRECISION,
  building_amenity_count             DOUBLE PRECISION,
  transit_access                     DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE rent_estimation_decisions (
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
CREATE TABLE rent_estimation_labels (
  decision_id    UUID        NOT NULL REFERENCES rent_estimation_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Rental Price Estimation": Estimate the market rent for a home or unit so owners, agents and tenants see a credible range. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Local median rent per room | Trailing 60-day median in the micro-area. Market anchor. | Leakage risk to design against: Mix of unit types. |
| A signal-versus-noise trap in this use case: Asking vs signed | The true signal is signed rents when known; the common noise is asking rents only. | Asking rents are 3-8% above what is signed. |

**Ask the experts**

- [ ] What exactly does "Response under 80 ms" mean in practice for rental price estimation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Local median rent per room" and "Unit size and layout", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Listing price changes after estimate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: asking rents leak into labels, and who can confirm the cut-off times and splits?
- [ ] How often does "New building" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Rent roll | A schedule of each tenant, unit, rent and lease expiry for a property. |
| Effective rent | Rent net of incentives such as free months, spread across the lease term. |
| Delinquency | A tenant being late on rent beyond the grace period. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
