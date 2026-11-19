# Shelf Monitoring & Planogram Compliance: data and feature specification

> Generated from the blueprint `retail/shelf-monitoring-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shelf Monitoring & Planogram Compliance · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Shelf Monitoring & Planogram Compliance": Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation on clean shelf photos.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Facing count vs planogram | detected facings minus planned facings | Compliance | Accurate planogram version |   |   |   |
| Empty-slot detection | empty gaps along the shelf edge | Out-of-stock | Occlusion handling |   |   |   |
| Price-tag OCR match | tag price vs system price | Pricing compliance | Tag detection quality |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Open-set | Few-shot SKU recognition via embeddings | Closed-set classifier retrained per SKU | Weekly new SKUs make closed-set retraining impossible |
| Action | Output prioritised tasks by lost-sales estimate | Raw detections | Store staff need a task list not boxes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Shelf lighting colour | environment |
| Camera model | device artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Facing count vs planogram inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: accurate planogram version. |
| Empty-slot detection inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: occlusion handling. |
| Price-tag OCR match inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: tag detection quality. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: shelf_monitoring_vision_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: facing_count_vs_planogram, type: double, nullable: false }
    - { name: empty_slot_detection, type: double, nullable: false }
    - { name: price_tag_ocr_match, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Facing count vs planogram and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Empty-slot detection against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Facing count vs planogram, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE shelf_monitoring_vision_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE shelf_monitoring_vision_detections (
  frame_id TEXT NOT NULL REFERENCES shelf_monitoring_vision_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE shelf_monitoring_vision_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Shelf Monitoring & Planogram Compliance": Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Inventory, replenishment and assortment | Stores and warehouses hold stock to meet uncertain demand. Replenishment decides when and how much to order, assortment planning decides which items to carry given limited shelf space, and substitution handles out-of-stock moments. Overstock ties up cash and expires; understock loses sales and customers. | Every forecast or recommendation has to respect stock: a perfect recommendation for an unavailable item is a failed one. |
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Price, promotion and demand | Price changes demand (elasticity), promotions pull sales forward or steal them from similar items (cannibalisation), and markdowns clear stock at the end of a season. Forecasts must treat promotions as known inputs, and price decisions as causal questions, not correlations. | Naively learning price from history confuses cause and effect: retailers discount slow items, so low prices correlate with low sales. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Facing count vs planogram | Detected facings minus planned facings. Compliance. | Leakage risk to design against: Accurate planogram version. |
| A signal-versus-noise trap in this use case: Open-set | The true signal is few-shot SKU recognition via embeddings; the common noise is closed-set classifier retrained per SKU. | Weekly new SKUs make closed-set retraining impossible. |

**Ask the experts**

- [ ] What exactly does "Works on phone and robot images" mean in practice for shelf monitoring & planogram compliance: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Facing count vs planogram" and "Empty-slot detection", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "On-shelf availability" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluation on clean shelf photos, and who can confirm the cut-off times and splits?
- [ ] How often does "Promotional displays off planogram" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Planogram | A diagram of how products should be arranged on shelves. |
| Assortment | The set of products a store or channel chooses to carry. |
| Shrinkage | Inventory lost to theft, damage or error between purchase and sale. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| Elasticity | How much demand changes for a given change in price. |
| Cannibalisation | A promotion on one item taking sales from a similar item rather than creating new demand. |
| Counterfeit | A fake product sold as genuine, a major marketplace trust issue. |
| Visual search | Finding products from a photograph or image rather than text. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Distribution shift | A change in the data a model sees compared with training. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
