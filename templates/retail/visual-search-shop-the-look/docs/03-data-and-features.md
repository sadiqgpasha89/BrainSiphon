# Visual Search & Shop-the-Look: data and feature specification

> Generated from the blueprint `retail/visual-search-shop-the-look` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Visual Search & Shop-the-Look · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Visual Search & Shop-the-Look": Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Query set built from catalogue crops.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Garment crop embedding | embedding of detected item crops | Per-item matching | Crop quality gates |   |   |   |
| Attribute classifier agreement | colour, pattern and category predictions | Re-ranking filter | Taxonomy aligned with catalogue |   |   |   |
| Availability and size in stock | live inventory signal | Business viability | Real-time inventory join |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Domain gap | Train on user-photo to catalogue-photo pairs | Catalogue-only contrastive training | Studio photos look nothing like phone photos |
| Granularity | Detect and crop each garment before embedding | Whole-image embedding | Background dominates whole-image embeddings |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Image EXIF | irrelevant and privacy-sensitive |
| Background texture | distracts embeddings |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Garment crop embedding inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: crop quality gates. |
| Attribute classifier agreement inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: taxonomy aligned with catalogue. |
| Availability and size in stock inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: real-time inventory join. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: visual_search_shop_the_look_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: garment_crop_embedding, type: double, nullable: false }
    - { name: attribute_classifier_agreement, type: double, nullable: false }
    - { name: availability_and_size_in_stock, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Garment crop embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Attribute classifier agreement against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Garment crop embedding, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Retailrocket recommender system dataset | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset | CC BY-NC-SA 4.0 (see the dataset page) | About 2.7 million view, add-to-cart and purchase events with item properties | Anonymised ids and no dwell time. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE visual_search_shop_the_look_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE visual_search_shop_the_look_detections (
  frame_id TEXT NOT NULL REFERENCES visual_search_shop_the_look_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE visual_search_shop_the_look_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Visual Search & Shop-the-Look": Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Search, browse and ranking in a marketplace | Shoppers arrive through search queries, category pages and recommendation strips. Each is a ranking problem with different signals: a query has explicit intent, a category page has none, and a marketplace must also be fair to sellers and obey sponsored-placement rules. Position bias means top slots get clicks regardless of quality. | Offline relevance judgments, click logs and revenue metrics disagree; ranking systems are judged by interleaving and online tests, with exposure and fairness constraints. |
| Sessions, anonymity and privacy | A session is a sequence of actions by one visitor, usually split by 30 minutes of inactivity. Many visitors are anonymous or have declined tracking, so the system may only use what happened in this visit and aggregated behaviour of others, not a stored profile. | The model must work from a few clicks, and the way sessions are cut decides what a sequence even is. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Garment crop embedding | Embedding of detected item crops. Per-item matching. | Leakage risk to design against: Crop quality gates. |
| A signal-versus-noise trap in this use case: Domain gap | The true signal is train on user-photo to catalogue-photo pairs; the common noise is catalogue-only contrastive training. | Studio photos look nothing like phone photos. |

**Ask the experts**

- [ ] What exactly does "100 ms end-to-end including detection" mean in practice for visual search & shop-the-look: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Garment crop embedding" and "Attribute classifier agreement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Visual search conversion" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: query set built from catalogue crops, and who can confirm the cut-off times and splits?
- [ ] How often does "Index refresh lags new arrivals" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Visual search | Finding products from a photograph or image rather than text. |
| Query understanding | Interpreting a search query: spelling correction, intent, entities and attributes. |
| Attribute extraction | Pulling structured fields such as brand, size and colour from product titles, descriptions and images. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Sequence model (SASRec) | A transformer that predicts the next item from a user's recent history. |
