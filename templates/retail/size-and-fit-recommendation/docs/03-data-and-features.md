# Size & Fit Recommendation: data and feature specification

> Generated from the blueprint `retail/size-and-fit-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Size & Fit Recommendation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Size & Fit Recommendation": Recommend the right size per item and shopper to cut size-related returns without discouraging purchase. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using kept items as correct without checking wear.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Brand-size offset | learned bias of a brand versus a reference scale | Cross-brand mapping | Estimated on matured returns |   |   |   |
| Shopper anchor items | sizes the user kept in similar brands | Personal calibration | Only kept items |   |   |   |
| Garment measurements vs user profile | difference between spec and user measures | Direct fit | Self-reported noise correction |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fit | Ordinal classes (small, fit, large) with brand-item offsets | Purchased size as truth | People keep ill-fitting items so purchased size is not the right size |
| Returns | Return reason codes as supervision | Returned equals wrong size | Many returns are not fit-related |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Item colour | not related to fit |
| Shopper age | proxy risk |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Brand-size offset inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: estimated on matured returns. |
| Shopper anchor items inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: only kept items. |
| Garment measurements vs user profile inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: self-reported noise correction. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: size_and_fit_recommendation_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: brand_size_offset, type: double, nullable: false }
    - { name: shopper_anchor_items, type: double, nullable: false }
    - { name: garment_measurements_vs_user_profile, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Brand-size offset and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Shopper anchor items against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Brand-size offset, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Instacart Market Basket Analysis | https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis | Competition rules; free Kaggle login | 3 million grocery orders from 200K users with reorder labels | No timestamps beyond day-of-week and hour; US grocery only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Criteo Display Advertising Challenge | https://www.kaggle.com/c/criteo-display-ad-challenge | Competition rules; free Kaggle login | About 45 million display-ad impressions with 13 numeric and 26 hashed categorical features and a click label | No position, timestamp or user id. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE size_and_fit_recommendation_impressions (
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

CREATE TABLE size_and_fit_recommendation_feedback (
  impression_id  UUID        NOT NULL REFERENCES size_and_fit_recommendation_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE size_and_fit_recommendation_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Size & Fit Recommendation": Recommend the right size per item and shopper to cut size-related returns without discouraging purchase. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Sessions, anonymity and privacy | A session is a sequence of actions by one visitor, usually split by 30 minutes of inactivity. Many visitors are anonymous or have declined tracking, so the system may only use what happened in this visit and aggregated behaviour of others, not a stored profile. | The model must work from a few clicks, and the way sessions are cut decides what a sequence even is. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Intent and the funnel | Shoppers move from browsing to comparing to buying: product views, add-to-cart, checkout and purchase. What is useful changes along the way: alternatives when someone is still choosing, accessories and complements once something is in the cart. | A good next item for a browsing shopper is a bad one for someone about to pay. Decide which stage each placement serves. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Brand-size offset | Learned bias of a brand versus a reference scale. Cross-brand mapping. | Leakage risk to design against: Estimated on matured returns. |
| A signal-versus-noise trap in this use case: Fit | The true signal is ordinal classes (small, fit, large) with brand-item offsets; the common noise is purchased size as truth. | People keep ill-fitting items so purchased size is not the right size. |

**Ask the experts**

- [ ] What exactly does "Brand-specific sizing" mean in practice for size & fit recommendation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Brand-size offset" and "Shopper anchor items", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Size-related return rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using kept items as correct without checking wear, and who can confirm the cut-off times and splits?
- [ ] How often does "Brand changes pattern mid-season" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cold start | A new item or visitor with no history to learn from. |
| Return rate | The share of purchases that are sent back, high in fashion and a major cost. |
| Size and fit | The relationship between a garment's size label and how it fits a person, a main cause of returns. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| Session | A visit: an ordered sequence of one visitor's actions, ended by inactivity or leaving. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Co-visitation | Counting how often two items are viewed in the same session, the basis of item-to-item recommenders. |
| Collaborative filtering | Recommending items liked by users similar to you. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| F1 score | The harmonic mean of precision and recall. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
