# Homepage Feed Recommendations: data and feature specification

> Generated from the blueprint `retail/homepage-feed-recommendations` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Homepage Feed Recommendations · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Homepage Feed Recommendations": Fill a personalised homepage feed that maximises long-term engagement and purchases for 10M users while managing diversity and freshness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on logged policy without propensities.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| User embedding recency | exponentially decayed mean of recent item embeddings | Interest drift | Decay constants tuned on pre-period |   |   |   |
| Item freshness and velocity | age and rolling interaction velocity | Newness | Exclude interactions after impression time |   |   |   |
| Cross features user-category | affinity times category popularity | Personalisation | Compute from lagged aggregates |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Retrieval | Multi-source candidate generation (two-tower, co-visitation, trending) | Single collaborative filtering model | One model has blind spots for new items and cold users |
| Objective | Multi-task heads for click, add-to-cart and purchase with calibrated blend | Optimising clicks only | Short-term clicks degrade long-run retention |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Total lifetime clicks | popularity bias |
| Device model | weak and unstable |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| User embedding recency inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: decay constants tuned on pre-period. |
| Item freshness and velocity inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: exclude interactions after impression time. |
| Cross features user-category inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: compute from lagged aggregates. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: homepage_feed_recommendations_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: user_embedding_recency, type: double, nullable: false }
    - { name: item_freshness_and_velocity, type: double, nullable: false }
    - { name: cross_features_user_category, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on User embedding recency and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Item freshness and velocity against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as User embedding recency, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MovieLens datasets | https://grouplens.org/datasets/movielens/ | GroupLens research terms (see the page) | Explicit ratings from 100K to 25M with timestamps, the standard recommender benchmark | Explicit ratings are not implicit clicks; film domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Bandit Dataset | https://research.zozo.com/data.html | CC BY 4.0 (see the page) | Logged bandit feedback from a fashion e-commerce site with propensities, for off-policy evaluation | One platform and a short period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Retailrocket recommender system dataset | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset | CC BY-NC-SA 4.0 (see the dataset page) | About 2.7 million view, add-to-cart and purchase events with item properties | Anonymised ids and no dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE homepage_feed_recommendations_impressions (
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

CREATE TABLE homepage_feed_recommendations_feedback (
  impression_id  UUID        NOT NULL REFERENCES homepage_feed_recommendations_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE homepage_feed_recommendations_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Homepage Feed Recommendations": Fill a personalised homepage feed that maximises long-term engagement and purchases for 10M users while managing diversity and freshness. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| A catalogue that never stands still | Items are added, go out of stock, change price and spike during sales and seasons. New items have no history (cold start), and a sale can reshuffle popularity within minutes. | Counts built last week can point at items that are gone, and a random split of historical sessions hides this drift. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Sessions, anonymity and privacy | A session is a sequence of actions by one visitor, usually split by 30 minutes of inactivity. Many visitors are anonymous or have declined tracking, so the system may only use what happened in this visit and aggregated behaviour of others, not a stored profile. | The model must work from a few clicks, and the way sessions are cut decides what a sequence even is. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: User embedding recency | Exponentially decayed mean of recent item embeddings. Interest drift. | Leakage risk to design against: Decay constants tuned on pre-period. |
| A signal-versus-noise trap in this use case: Retrieval | The true signal is multi-source candidate generation (two-tower, co-visitation, trending); the common noise is single collaborative filtering model. | One model has blind spots for new items and cold users. |

**Ask the experts**

- [ ] What exactly does "60 ms feed assembly" mean in practice for homepage feed recommendations: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "User embedding recency" and "Item freshness and velocity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Purchases per user session" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on logged policy without propensities, and who can confirm the cut-off times and splits?
- [ ] How often does "New user with no history" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Co-visitation | Counting how often two items are viewed in the same session, the basis of item-to-item recommenders. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Cold start | A new item or visitor with no history to learn from. |
| Coverage | The share of the catalogue that is ever recommended, a guard against popularity machines. |
| Diversity | How different the recommended items are from each other, so a strip is not ten near-identical products. |
| NDCG | A ranking metric that discounts relevant items by how far down the list they appear. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Sequence model (SASRec) | A transformer that predicts the next item from a user's recent history. |
