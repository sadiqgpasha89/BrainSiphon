# Checkout-Free Store Vision: data and feature specification

> Generated from the blueprint `retail/checkout-free-store-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Checkout-Free Store Vision · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Checkout-Free Store Vision": Track shoppers and pick/put events with camera and weight sensors to produce accurate virtual baskets without checkout. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training data from staged shoppers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Weight-delta match | measured shelf weight change vs SKU weight | Disambiguates picks | Calibrated load cells |   |   |   |
| Hand-item interaction score | action recogniser output | Pick vs touch | Temporal context |   |   |   |
| Track-merge confidence | cross-camera ReID similarity | Basket assignment | Spatial constraints |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fusion | Fuse vision with shelf weight and RFID | Vision only | Occlusion in crowded aisles breaks vision-only |
| Tracking | Person tracks via appearance and spatial continuity | Face recognition | Faces are privacy-unsafe and unnecessary |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Shopper clothing colour | changes and collides |
| Time-in-store | not a basket signal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Weight-delta match inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibrated load cells. |
| Hand-item interaction score inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: temporal context. |
| Track-merge confidence inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: spatial constraints. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: checkout_free_store_vision_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: weight_delta_match, type: double, nullable: false }
    - { name: hand_item_interaction_score, type: double, nullable: false }
    - { name: track_merge_confidence, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Weight-delta match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Hand-item interaction score against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Weight-delta match, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE checkout_free_store_vision_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE checkout_free_store_vision_detections (
  frame_id TEXT NOT NULL REFERENCES checkout_free_store_vision_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE checkout_free_store_vision_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Checkout-Free Store Vision": Track shoppers and pick/put events with camera and weight sensors to produce accurate virtual baskets without checkout. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Inventory, replenishment and assortment | Stores and warehouses hold stock to meet uncertain demand. Replenishment decides when and how much to order, assortment planning decides which items to carry given limited shelf space, and substitution handles out-of-stock moments. Overstock ties up cash and expires; understock loses sales and customers. | Every forecast or recommendation has to respect stock: a perfect recommendation for an unavailable item is a failed one. |
| Trust and safety in marketplaces | Marketplaces face fake reviews, counterfeit goods, seller fraud, return abuse and checkout payment fraud. Attackers adapt, ground truth is partial, and enforcement affects honest sellers and buyers. | Precision matters as much as recall because every false action penalises a real seller or shopper. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Weight-delta match | Measured shelf weight change vs SKU weight. Disambiguates picks. | Leakage risk to design against: Calibrated load cells. |
| A signal-versus-noise trap in this use case: Fusion | The true signal is fuse vision with shelf weight and RFID; the common noise is vision only. | Occlusion in crowded aisles breaks vision-only. |

**Ask the experts**

- [ ] What exactly does "Billing accuracy above 99.5%" mean in practice for checkout-free store vision: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Weight-delta match" and "Hand-item interaction score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Billing disputes per 1000 baskets" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training data from staged shoppers, and who can confirm the cut-off times and splits?
- [ ] How often does "Crowded store at peak" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Shrinkage | Inventory lost to theft, damage or error between purchase and sale. |
| Planogram | A diagram of how products should be arranged on shelves. |
| AOV | Average order value: revenue divided by the number of orders. |
| Basket | The set of items in a customer's cart or order; basket analysis finds items bought together. |
| Assortment | The set of products a store or channel chooses to carry. |
| Visual search | Finding products from a photograph or image rather than text. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Replenishment | Ordering or moving stock to restore inventory to target levels. |
| Delivery promise | The delivery date or window shown to the customer at checkout. |
| Counterfeit | A fake product sold as genuine, a major marketplace trust issue. |
| Re-identification | Recognising the same person or object across different camera views. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
