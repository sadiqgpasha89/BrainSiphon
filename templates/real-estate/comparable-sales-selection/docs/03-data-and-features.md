# Comparable Sales Selection: data and feature specification

> Generated from the blueprint `real-estate/comparable-sales-selection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Comparable Sales Selection · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Comparable Sales Selection": Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Appraiser comps are biased toward familiar sales.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Learned property embedding | vector from attributes and photos | Similarity | Training data bias |   |   |   |
| Sale recency weight | days since sale | Time | Market speed |   |   |   |
| Same school or tract flag | within the same boundary | Locality | Boundary changes |   |   |   |
| Adjustment size | percentage adjustment for features | Quality | Estimated by a model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Similarity | Learned similarity on what drives price | Distance and size only | A near neighbour with a different school zone is a poor comparable |
| Recency | Sales recency with time adjustment | Last 12 months equally | Fast markets age comparables quickly |
| Adjustment | Explicit adjustments for differences | Raw prices | Raw comps ignore a pool or an extra bedroom |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Seller name | irrelevant |
| Listing agent | irrelevant |
| Photo order | arbitrary |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Learned property embedding inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: training data bias. |
| Sale recency weight inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: market speed. |
| Same school or tract flag inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: boundary changes. |
| Adjustment size inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: estimated by a model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: comparable_sales_selection_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: learned_property_embedding, type: double, nullable: false }
    - { name: sale_recency_weight, type: double, nullable: false }
    - { name: same_school_or_tract_flag, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Learned property embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Sale recency weight against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Learned property embedding, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CodeSearchNet | https://github.com/github/CodeSearchNet | MIT licence plus per-project licences (see the repository) | About 2 million functions with natural-language documentation in six languages | Docstrings are not user queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE comparable_sales_selection_impressions (
  impression_id  UUID PRIMARY KEY,
  user_id        TEXT        NOT NULL,
  shown_at       TIMESTAMPTZ NOT NULL,
  surface        TEXT        NOT NULL,
  item_id        TEXT        NOT NULL,
  rank           SMALLINT    NOT NULL,
  score          REAL,
  propensity     REAL        NOT NULL,   -- probability the policy showed this item at this rank
  source         TEXT        NOT NULL,   -- ann | co-visit | trending | business-rule | exploration
  model_version  TEXT        NOT NULL,
  experiment_arm TEXT
) PARTITION BY RANGE (shown_at);

CREATE TABLE comparable_sales_selection_feedback (
  impression_id  UUID        NOT NULL REFERENCES comparable_sales_selection_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE comparable_sales_selection_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Comparable Sales Selection": Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Learned property embedding | Vector from attributes and photos. Similarity. | Leakage risk to design against: Training data bias. |
| A signal-versus-noise trap in this use case: Similarity | The true signal is learned similarity on what drives price; the common noise is distance and size only. | A near neighbour with a different school zone is a poor comparable. |

**Ask the experts**

- [ ] What exactly does "Comparable set explainable to an appraiser" mean in practice for comparable sales selection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Learned property embedding" and "Sale recency weight", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Appraiser time per report" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: appraiser comps are biased toward familiar sales, and who can confirm the cut-off times and splits?
- [ ] How often does "Few comparables" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Comparable (comp) | A recent sale of a similar nearby property used to estimate the value of the subject property. |
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| AVM | Automated valuation model: software that estimates a property's market value from data instead of an on-site appraisal. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Position bias | Higher slots get more attention regardless of relevance. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
