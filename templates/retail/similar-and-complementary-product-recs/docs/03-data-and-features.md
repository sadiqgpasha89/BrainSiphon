# Similar & Complementary Product Recommendations: data and feature specification

> Generated from the blueprint `retail/similar-and-complementary-product-recs` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Similar & Complementary Product Recommendations · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Similar & Complementary Product Recommendations": Show substitutes on out-of-stock or low-fit items and complements at cart, lifting basket size without cannibalising margin. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Co-view mistaken for complement.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Co-purchase lift | PMI of co-purchase versus independence | Complement relation | Use matured orders only |   |   |   |
| Visual-text embedding distance | multimodal embedding similarity | Substitute relation | Domain-specific fine-tuning |   |   |   |
| Attribute compatibility flags | structured compatibility table | Correctness | Maintain via catalogue pipeline |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Relation | Separate similar (substitute) and complementary (co-purchase) relations | One similarity score for all | Substitutes are rarely bought together; mixing them hurts both |
| Compatibility | Hard attribute-compatibility constraints | Purely behavioural signals | Behavioural data recommends incompatible accessories |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Popularity of the pair | favours blockbuster items |
| Raw price difference | misleading across categories |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Co-purchase lift inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: use matured orders only. |
| Visual-text embedding distance inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: domain-specific fine-tuning. |
| Attribute compatibility flags inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: maintain via catalogue pipeline. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: similar_and_complementary_product_recs_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: co_purchase_lift, type: double, nullable: false }
    - { name: visual_text_embedding_distance, type: double, nullable: false }
    - { name: attribute_compatibility_flags, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Co-purchase lift and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Visual-text embedding distance against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Co-purchase lift, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE similar_and_complementary_impressions (
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

CREATE TABLE similar_and_complementary_feedback (
  impression_id  UUID        NOT NULL REFERENCES similar_and_complementary_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE similar_and_complementary_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Similar & Complementary Product Recommendations": Show substitutes on out-of-stock or low-fit items and complements at cart, lifting basket size without cannibalising margin. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Substitutes and complements | Substitutes compete with each other (two similar lamps); complements are bought together (lamp and bulb). Co-view data tends to find substitutes and co-purchase data complements, and order matters because a phone leads to a case more often than a case leads to a phone. | Treating the session as an unordered bag of items merges the two relations and loses direction. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Graph learning and its pitfalls | Graph neural networks and graph features (degree, centrality, personalised PageRank, motifs) propagate information along edges. Leakage hides in the split: random edge splits put future or neighbouring information into training; time-based and node-based splits are safer. | Evaluate on whole communities or later periods, and compare with simple hand-built graph features before adding a GNN. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Co-purchase lift | PMI of co-purchase versus independence. Complement relation. | Leakage risk to design against: Use matured orders only. |
| A signal-versus-noise trap in this use case: Relation | The true signal is separate similar (substitute) and complementary (co-purchase) relations; the common noise is one similarity score for all. | Substitutes are rarely bought together; mixing them hurts both. |

**Ask the experts**

- [ ] What exactly does "Compatibility correctness (phone case fits phone)" mean in practice for similar & complementary product recommendations: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Co-purchase lift" and "Visual-text embedding distance", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Attach rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: co-view mistaken for complement, and who can confirm the cut-off times and splits?
- [ ] How often does "Accessory for discontinued model" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Complementary item | A product bought together with another, such as a case with a phone. |
| Substitute / complement | An alternative to the current item, versus an item bought together with it. |
| Basket | The set of items in a customer's cart or order; basket analysis finds items bought together. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| HitRate@K | The share of test sessions in which the true next item appears among the top K recommendations. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| Attribute extraction | Pulling structured fields such as brand, size and colour from product titles, descriptions and images. |
| Collaborative filtering | Recommending items liked by users similar to you. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| Hit rate@K | The share of cases in which the true item appears in the top K. |
| Node / edge | The entities in a graph and the relationships between them. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Link prediction | Predicting whether an edge exists or will form between two nodes. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
