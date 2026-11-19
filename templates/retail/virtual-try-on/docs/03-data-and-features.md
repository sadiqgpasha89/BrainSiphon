# Virtual Try-On: data and feature specification

> Generated from the blueprint `retail/virtual-try-on` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Virtual Try-On · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Virtual Try-On": Render garments, glasses or makeup on a user's photo or live camera realistically enough to cut returns. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluated on studio models only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Body keypoints and parsing | pose and segmentation masks | Alignment | Robust to clothing |   |   |   |
| Garment geometry features | measurements and fabric type | Drape | Catalogue data quality |   |   |   |
| Identity preservation score | face and body identity similarity | Quality | Metric gaming risk |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fidelity | Garment-warping with body parsing and diffusion refinement | Simple overlay | Overlays ignore drape and size |
| Fit | Size-aware rendering | One-size render | Users judge fit from the rendering |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Photo background | removed |
| Image EXIF | privacy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Body keypoints and parsing inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: robust to clothing. |
| Garment geometry features inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: catalogue data quality. |
| Identity preservation score inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: metric gaming risk. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: virtual_try_on_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: body_keypoints_and_parsing, type: double, nullable: false }
    - { name: garment_geometry_features, type: double, nullable: false }
    - { name: identity_preservation_score, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Body keypoints and parsing and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Garment geometry features against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Body keypoints and parsing, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE virtual_try_on_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE virtual_try_on_detections (
  frame_id TEXT NOT NULL REFERENCES virtual_try_on_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE virtual_try_on_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Virtual Try-On": Render garments, glasses or makeup on a user's photo or live camera realistically enough to cut returns. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Fulfilment, delivery promises and returns | Orders are routed to warehouses or stores, shipped and sometimes returned. A delivery promise shown at checkout must be one the network can keep; reverse logistics decides whether to resell, refurbish or liquidate a return. | Promising too early causes late deliveries and complaints; promising too late loses conversion, so errors are asymmetric. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Body keypoints and parsing | Pose and segmentation masks. Alignment. | Leakage risk to design against: Robust to clothing. |
| A signal-versus-noise trap in this use case: Fidelity | The true signal is garment-warping with body parsing and diffusion refinement; the common noise is simple overlay. | Overlays ignore drape and size. |

**Ask the experts**

- [ ] What exactly does "Under 3 s for photo or 30 fps live" mean in practice for virtual try-on: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Body keypoints and parsing" and "Garment geometry features", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Return rate of try-on users" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluated on studio models only, and who can confirm the cut-off times and splits?
- [ ] How often does "Diverse body shapes underrepresented" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Return rate | The share of purchases that are sent back, high in fashion and a major cost. |
| Size and fit | The relationship between a garment's size label and how it fits a person, a main cause of returns. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| SKU | Stock-keeping unit: one distinct product variant such as a size and colour. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| RFM | Recency, frequency and monetary value: three measures used to segment customers. |
| Assortment | The set of products a store or channel chooses to carry. |
| Substitution | Offering a different item when the ordered one is out of stock. |
| Reverse logistics | Handling returned goods: inspection, resale, refurbishment, liquidation or recycling. |
| Perceptual loss | A loss that compares images using the features of a pretrained network instead of raw pixels. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Dice coefficient | An overlap score between two regions, widely used for segmentation. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
