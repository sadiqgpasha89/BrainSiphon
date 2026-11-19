# Site Selection for Retail & Logistics: data and feature specification

> Generated from the blueprint `real-estate/site-selection-for-retail-and-logistics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Site Selection for Retail & Logistics · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Site Selection for Retail & Logistics": Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Survivor sites are those that were opened and kept, so failed locations are missing from the data.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Catchment population | residents within a 15-minute drive weighted by purchasing power | The main driver of demand | Census data age, so adjust with recent growth |   |   |   |
| Competitor density | number and size of competing stores within the catchment | Competition reduces demand | Definitions of a competitor differ, so use a consistent category |   |   |   |
| Mobility flows | anonymised footfall or vehicle counts passing the site, per hour | Shows actual movement of potential customers | Panels are samples, so check representativeness |   |   |   |
| Network fit | average distance from the site to the company's hubs and suppliers | Drives cost for logistics sites | Road conditions change, so use time and not distance |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Catchment | Drive-time and walk-time catchments built from the road network | A fixed radius circle | Rivers, motorways and rail lines shape real catchments, so a circle misses where customers come from |
| Cannibalisation | The effect of a new site on the company's own nearby sites | The new site evaluated alone | A strong new store that pulls sales from an existing one adds less than its revenue |
| Transfer | Validity checks for a new market with few comparable sites | A model fit only on existing markets | Extrapolating to a new market assumes it behaves like the old ones, which is often untrue |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Site name | A label that carries no demand information |
| Broker | The agent selling a site does not change its performance |
| Photo | Marketing images of the site do not change catchment or competition |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Catchment population inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: census data age, so adjust with recent growth. |
| Competitor density inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: definitions of a competitor differ, so use a consistent category. |
| Mobility flows inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: panels are samples, so check representativeness. |
| Network fit inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: road conditions change, so use time and not distance. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: site_selection_for_retail_and_logistics_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: catchment_population, type: double, nullable: false }
    - { name: competitor_density, type: double, nullable: false }
    - { name: mobility_flows, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Catchment population and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Competitor density against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Catchment population, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Olist Brazilian E-Commerce | https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce | CC BY-NC-SA 4.0 (see the dataset page) | 100K orders with items, payments, reviews, delivery times and seller data | One marketplace and year; useful for delivery, review and seller analyses. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| California Housing (scikit-learn) | https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html | BSD-3 code; census-derived data | 20,640 census block groups with median house value, income and location, loaded with one function call | Block-group medians from 1990, not individual homes; values are capped. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a run is the unit of work: inputs, outputs and counts are reconcilable
CREATE TABLE site_selection_for_retail_and_runs (
  run_id TEXT PRIMARY KEY, run_date DATE NOT NULL, status TEXT NOT NULL, model_version TEXT NOT NULL,
  rows_in BIGINT, rows_out BIGINT, rows_quarantined BIGINT, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);

CREATE TABLE site_selection_for_retail_and_outputs (
  run_id TEXT NOT NULL REFERENCES site_selection_for_retail_and_runs, entity_id TEXT NOT NULL, score REAL, band TEXT, reason_codes JSONB,
  PRIMARY KEY (run_id, entity_id)
) PARTITION BY HASH (entity_id);

-- rows that failed validation are kept, not dropped, so the gap is explainable
CREATE TABLE site_selection_for_retail_and_quarantine (
  run_id TEXT NOT NULL, entity_id TEXT, reason TEXT NOT NULL, payload JSONB, PRIMARY KEY (run_id, entity_id, reason)
);

CREATE TABLE site_selection_for_retail_and_labels (
  entity_id TEXT NOT NULL, run_id TEXT NOT NULL, label SMALLINT NOT NULL, label_source TEXT NOT NULL, labeled_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, run_id, labeled_at)
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Site Selection for Retail & Logistics": Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Catchment population | Residents within a 15-minute drive weighted by purchasing power. The main driver of demand. | Leakage risk to design against: Census data age, so adjust with recent growth. |
| A signal-versus-noise trap in this use case: Catchment | The true signal is drive-time and walk-time catchments built from the road network; the common noise is a fixed radius circle. | Rivers, motorways and rail lines shape real catchments, so a circle misses where customers come from. |

**Ask the experts**

- [ ] What exactly does "No protected attributes or close proxies in demand models" mean in practice for site selection for retail & logistics: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Catchment population" and "Competitor density", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "New site performance" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: survivor sites are those that were opened and kept, so failed locations are missing from the data, and who can confirm the cut-off times and splits?
- [ ] How often does "New market" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Days on market | The number of days a listing takes to go under contract. |
| Comparable (comp) | A recent sale of a similar nearby property used to estimate the value of the subject property. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Zoning | Local rules that limit how land can be used and built on, such as height, density and use. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Security deposit | Money held against damage or unpaid rent, returned after deductions at move-out. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Uplift / CATE | The causal effect of a treatment for a unit with given features. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Hub node | A node connected to a very large number of others, such as a shared public address. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
