# Session-Based Next-Item Recommendation: data and feature specification

> Generated from the blueprint `retail/session-based-next-item-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Session-Based Next-Item Recommendation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Session-Based Next-Item Recommendation": Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Random session splits leak popularity.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Last-k item embeddings | transformer encoding of last 20 interactions | Captures what the shopper wants right now | Cap sequence length so latency stays inside the budget |   |   |   |
| Dwell and scroll depth | seconds on item pages and scroll fraction | Shows how strongly the shopper cares about an item | Bots inflate or deflate dwell, so filter them first |   |   |   |
| Session goal inference | classifier over browse vs compare vs purchase | Changes what to recommend: alternatives versus accessories | Label from the eventual purchase carefully to avoid leakage |   |   |   |
| Session theme category | share of recent items in each category | A shopper keeps returning to one need, such as lamps | Compute from the prefix only, never including the item to be predicted |   |   |   |
| Transition recency | how recently each item-to-item transition was observed, decayed over days | Catalogue and trends change within days | Decay by event time and keep the training cut-off before the test window |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Order | Sequence models capturing transitions and intent shifts | Bag-of-items co-occurrence that ignores click order | Order distinguishes browsing from buying intent |
| Negatives | Sampled softmax with popularity-corrected negatives | Uniform random negatives for evaluation | Easy negatives inflate offline metrics |
| Bots | Bot and crawler filtering before any counts are built | Using every click as a human signal | Crawlers walking the catalogue in id order create transitions as strong as real shopper behaviour |
| Evaluation | Time-split leave-last-out with MRR and catalogue coverage | Random session splits and hit rate alone | A random split lets a sale's popularity shift appear on both sides and flatters the baseline |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Session ID | arbitrary |
| Total session clicks | confounded with browsing style |
| Raw click count per item | dominated by crawlers and promotions rather than genuine interest |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Last-k item embeddings inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: cap sequence length so latency stays inside the budget. |
| Dwell and scroll depth inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: bots inflate or deflate dwell, so filter them first. |
| Session goal inference inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: label from the eventual purchase carefully to avoid leakage. |
| Session theme category inputs | Catalogue operations | Product information management (PIM) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: compute from the prefix only, never including the item to be predicted. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: session_based_next_item_recommendation_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: last_k_item_embeddings, type: double, nullable: false }
    - { name: dwell_and_scroll_depth, type: double, nullable: false }
    - { name: session_goal_inference, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Last-k item embeddings and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Dwell and scroll depth against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Last-k item embeddings, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Retailrocket recommender system dataset | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset | CC BY-NC-SA 4.0 (check the dataset page); free Kaggle login | About 2.7 million view, add-to-cart and transaction events from 1.4 million visitors over four months, with item properties and a category tree | Anonymised ids and no dwell time, so bot filtering must rely on event counts and timing; sessions have to be reconstructed from visitor ids and time gaps |
| RecSys Challenge 2015 (YooChoose clicks and buys) | https://www.kaggle.com/datasets/chadgostopp/recsys-challenge-2015 | Challenge terms; free Kaggle login | About 33 million click events grouped into sessions with item and category ids, and which sessions ended in a purchase, useful for session-goal labels | Sessions are given but old (2014) and categories are coarse; popularity drifts, so keep a strict time split |
| Amazon-M2 multilingual shopping session dataset | https://arxiv.org/abs/2307.09688 | See the paper for the data licence and download instructions | A large set of anonymised shopping sessions across several locales with product attributes, a modern benchmark for next-item prediction | Several locales with different catalogues; evaluate each locale separately before pooling |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE session_based_next_item_impressions (
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

CREATE TABLE session_based_next_item_feedback (
  impression_id  UUID        NOT NULL REFERENCES session_based_next_item_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE session_based_next_item_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Sessions, anonymity and privacy | A session is a sequence of actions by one visitor, usually split by 30 minutes of inactivity. Many visitors are anonymous or have declined tracking, so the system may only use what happened in this visit and aggregated behaviour of others, not a stored profile. | The model must work from a few clicks, and the way sessions are cut decides what a sequence even is. |
| Intent and the funnel | Shoppers move from browsing to comparing to buying: product views, add-to-cart, checkout and purchase. What is useful changes along the way: alternatives when someone is still choosing, accessories and complements once something is in the cart. | A good next item for a browsing shopper is a bad one for someone about to pay. Decide which stage each placement serves. |
| Substitutes and complements | Substitutes compete with each other (two similar lamps); complements are bought together (lamp and bulb). Co-view data tends to find substitutes and co-purchase data complements, and order matters because a phone leads to a case more often than a case leads to a phone. | Treating the session as an unordered bag of items merges the two relations and loses direction. |
| A catalogue that never stands still | Items are added, go out of stock, change price and spike during sales and seasons. New items have no history (cold start), and a sale can reshuffle popularity within minutes. | Counts built last week can point at items that are gone, and a random split of historical sessions hides this drift. |
| Bots, crawlers and non-human traffic | Price scrapers, search crawlers and fraud bots click through catalogues quickly and in patterns, sometimes in id order. They often make up a large share of sessions and have no purchase intent. | Counting their clicks creates strong but spurious transitions that outrank real shopper behaviour. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |

**Ask the experts**

- [ ] How is a session defined, and how do we currently identify and exclude bots and crawlers?
- [ ] Which placements use this model, at which funnel stage, and what should each recommend (alternatives or accessories)?
- [ ] What rules must every recommendation obey: stock, margin, brand pins, bans, sponsored items or seller fairness?
- [ ] How do sales, promotions and launches change the catalogue and popularity, and how fast must the model react?
- [ ] Which online metric decides success (click-through, add-to-cart, revenue per visit), and how well has offline MRR predicted it before?

**Glossary**

| Term | Definition |
|---|---|
| Session | A visit: an ordered sequence of one visitor's actions, ended by inactivity or leaving. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Co-visitation | Counting how often two items are viewed in the same session, the basis of item-to-item recommenders. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Substitute / complement | An alternative to the current item, versus an item bought together with it. |
| Cold start | A new item or visitor with no history to learn from. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| Coverage | The share of the catalogue that is ever recommended, a guard against popularity machines. |
| Diversity | How different the recommended items are from each other, so a strip is not ten near-identical products. |
| HitRate@K | The share of test sessions in which the true next item appears among the top K recommendations. |
| MRR | Mean reciprocal rank: the average of one over the rank of the true next item, rewarding it being near the top. |
| NDCG | A ranking metric that discounts relevant items by how far down the list they appear. |
| Leave-last-out | Evaluation that hides each session's final item and asks the model to predict it from the rest. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| SASRec | A transformer-style sequence model for next-item prediction that attends over a user's recent items. |
| Interleaving | An online test that mixes results from two rankers in one list and sees which gets more clicks, needing less traffic than an A/B test. |
| Merchandising | Business rules over what is shown: pins, bans, margin targets, brand deals and sponsored placements. |
| GMV | Gross merchandise value: the total value of goods sold through the shop or marketplace. |
