# Home Search Ranking: data and feature specification

> Generated from the blueprint `real-estate/home-search-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Home Search Ranking · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Home Search Ranking": Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Position bias in click logs means top results look better than they are.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Price fit | position of the price within the buyer's stated range, scaled from 0 to 1 | The main relevance factor for most buyers | The range changes during a search, so use the current one |   |   |   |
| Saved and shared | saves and shares of this listing by buyers with similar filters in the last 7 days | A strong interest signal | Sparse for new listings, so smooth with a prior |   |   |   |
| Listing freshness | hours since the listing went live, passed through a decay function | New homes sell quickly and buyers want them first | Decay too steeply and a good older home disappears |   |   |   |
| Commute fit | travel time from the home to the buyer's saved workplace at rush hour | Commute is a hard constraint for many buyers | Routing data is expensive, so precompute for common destinations |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Intent | Session intent built from filters, saves and shares | Clicks alone | Clicks reward photo quality and not fit, so a model of clicks learns to show pretty homes that do not match |
| Fit | A hard match on price, bedrooms and location before any scoring | A soft score that trades fit against engagement | A home outside the buyer's budget wastes the result slot and annoys the buyer |
| Fairness | Exposure rules that give comparable listings comparable visibility | Pure engagement maximisation | Engagement data carries the bias of past behaviour, and optimising it can embed steering |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Photo count | Reflects portal and agent habits and not suitability for the buyer |
| Listing agent | Has no bearing on what the buyer wants and invites bias in exposure |
| Time on page alone | Confounded by distraction and device, and a long visit can mean confusion |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Price fit inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: the range changes during a search, so use the current one. |
| Saved and shared inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: sparse for new listings, so smooth with a prior. |
| Listing freshness inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: decay too steeply and a good older home disappears. |
| Commute fit inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: routing data is expensive, so precompute for common destinations. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: home_search_ranking_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: price_fit, type: double, nullable: false }
    - { name: saved_and_shared, type: double, nullable: false }
    - { name: listing_freshness, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Price fit and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Saved and shared against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Price fit, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KDD Cup 2012 Track 2: ad click prediction | https://www.kaggle.com/c/kddcup2012-track2 | Competition rules; free Kaggle login | Search-ad impressions with query, ad, user and position fields | Old and anonymised, but it records the display position. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE home_search_ranking_impressions (
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

CREATE TABLE home_search_ranking_feedback (
  impression_id  UUID        NOT NULL REFERENCES home_search_ranking_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE home_search_ranking_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Home Search Ranking": Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Price fit | Position of the price within the buyer's stated range, scaled from 0 to 1. The main relevance factor for most buyers. | Leakage risk to design against: The range changes during a search, so use the current one. |
| A signal-versus-noise trap in this use case: Intent | The true signal is session intent built from filters, saves and shares; the common noise is clicks alone. | Clicks reward photo quality and not fit, so a model of clicks learns to show pretty homes that do not match. |

**Ask the experts**

- [ ] What exactly does "Under 80 ms at the 99th percentile including retrieval and re-rank" mean in practice for home search ranking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Price fit" and "Saved and shared", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Saves and enquiries per session" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: position bias in click logs means top results look better than they are, and who can confirm the cut-off times and splits?
- [ ] How often does "Cold start buyer" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Days on market | The number of days a listing takes to go under contract. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Steering | Guiding people toward or away from neighbourhoods based on protected characteristics. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Redlining | Denying or worsening services in certain areas based on the demographics of the area. |
| Position bias | Higher slots get more attention regardless of relevance. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Sequence model (SASRec) | A transformer that predicts the next item from a user's recent history. |
