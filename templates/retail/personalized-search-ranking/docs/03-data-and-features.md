# Personalised Product Search Ranking: data and feature specification

> Generated from the blueprint `retail/personalized-search-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Personalised Product Search Ranking · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Personalised Product Search Ranking": Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on clicks from the current ranker.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Query-item semantic score | cosine of query and item embeddings from a dual encoder | Relevance backbone | Embeddings must be trained on pre-period logs |   |   |   |
| Item price-rank within query | percentile of price among retrieved results | Price sensitivity cue | Compute over the retrieved set not the catalogue |   |   |   |
| User-category affinity | decayed purchase and click share by category | Personalisation | Exclude events in the current session after the query |   |   |   |
| Slot position (training only) | position-bias tower input that is dropped or fixed to slot 1 at inference (PAL) | Separates exposure from relevance | If position leaks into serving features the ranker reproduces the page layout |   |   |   |
| Deliverable at pincode | bitmap membership for the shopper pincode or dark store | Hard eligibility | Inventory stream lag shows sold-out items, so version the bitmaps and log staleness |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Position bias | Inverse-propensity-weighted clicks from randomised swaps | Raw click logs | Top positions get clicks regardless of relevance |
| Objective | Purchase-weighted graded relevance (view, cart, buy) | Click-through rate alone | CTR rewards clickbait images and hurts conversion |
| Utility | Multi-task utility: click, cart given click, purchase given cart weighted by margin, plus a seller-exposure term | Click probability alone | Cheap impulse items win clicks while high-consideration products lose, and exposure concentrates on already-popular sellers |
| Serviceability | Roaring-bitmap availability masks inside the retrieval shard before any ranking | Scoring 1,000 candidates and then dropping the 700 not deliverable to the pincode | The ranker burns CPU or GPU on items that can never be shown and the shortlist comes back short |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw impressions count | rich-get-richer feedback loop |
| Item title length | spurious correlation with conversions |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Query-item semantic score inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: embeddings must be trained on pre-period logs. |
| Item price-rank within query inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: compute over the retrieved set not the catalogue. |
| User-category affinity inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: exclude events in the current session after the query. |
| Slot position (training only) inputs | Catalogue operations | Product information management (PIM) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: if position leaks into serving features the ranker reproduces the page layout. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: personalized_search_ranking_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: query_item_semantic_score, type: double, nullable: false }
    - { name: item_price_rank_within_query, type: double, nullable: false }
    - { name: user_category_affinity, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Query-item semantic score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Item price-rank within query against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Query-item semantic score, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KDD Cup 2012 Track 2: ad click prediction | https://www.kaggle.com/c/kddcup2012-track2 | Competition rules; free Kaggle login | Search-ad impressions with query, ad, user and position fields | Old and anonymised, but it records the display position. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE personalized_search_ranking_impressions (
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

CREATE TABLE personalized_search_ranking_feedback (
  impression_id  UUID        NOT NULL REFERENCES personalized_search_ranking_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE personalized_search_ranking_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Personalised Product Search Ranking": Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Search, browse and ranking in a marketplace | Shoppers arrive through search queries, category pages and recommendation strips. Each is a ranking problem with different signals: a query has explicit intent, a category page has none, and a marketplace must also be fair to sellers and obey sponsored-placement rules. Position bias means top slots get clicks regardless of quality. | Offline relevance judgments, click logs and revenue metrics disagree; ranking systems are judged by interleaving and online tests, with exposure and fairness constraints. |
| A catalogue that never stands still | Items are added, go out of stock, change price and spike during sales and seasons. New items have no history (cold start), and a sale can reshuffle popularity within minutes. | Counts built last week can point at items that are gone, and a random split of historical sessions hides this drift. |
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Query-item semantic score | Cosine of query and item embeddings from a dual encoder. Relevance backbone. | Leakage risk to design against: Embeddings must be trained on pre-period logs. |
| A signal-versus-noise trap in this use case: Position bias | The true signal is inverse-propensity-weighted clicks from randomised swaps; the common noise is raw click logs. | Top positions get clicks regardless of relevance. |

**Ask the experts**

- [ ] What exactly does "p99 under 80 ms including retrieval" mean in practice for personalised product search ranking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Query-item semantic score" and "Item price-rank within query", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Search conversion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on clicks from the current ranker, and who can confirm the cut-off times and splits?
- [ ] How often does "New seller floods catalogue with keyword-stuffed items" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Query understanding | Interpreting a search query: spelling correction, intent, entities and attributes. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| NDCG | A ranking metric that discounts relevant items by how far down the list they appear. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| p99 latency | The time within which 99% of requests complete. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
