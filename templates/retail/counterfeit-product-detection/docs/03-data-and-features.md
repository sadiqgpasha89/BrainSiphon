# Counterfeit Product Detection: data and feature specification

> Generated from the blueprint `retail/counterfeit-product-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Counterfeit Product Detection · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Counterfeit Product Detection": Find counterfeit listings using images, text, price and seller signals, supporting brand-owner takedowns with strong evidence. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Fakes in training from easy known sellers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Logo and tag fidelity | fine-grained logo similarity to brand references | Visual authenticity | Reference set curated by brand |   |   |   |
| Price-to-MSRP ratio | price divided by MSRP floor | Economic signal | MSRP as-of |   |   |   |
| Seller risk and authorised flag | authorisation status and history | Contextual | Brand-provided lists |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Brand | Per-brand verified catalogues and authentication attributes | Generic fake classifier | Generic models don't know a brand's logo detail |
| Price | Price far below authorised-channel floor | Price alone | Genuine discounts and grey-market parallel imports exist |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Listing language | uninformative |
| Image resolution | seller-device |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Logo and tag fidelity inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: reference set curated by brand. |
| Price-to-MSRP ratio inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: MSRP as-of. |
| Seller risk and authorised flag inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: brand-provided lists. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: counterfeit_product_detection_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: logo_and_tag_fidelity, type: double, nullable: false }
    - { name: price_to_msrp_ratio, type: double, nullable: false }
    - { name: seller_risk_and_authorised_flag, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Logo and tag fidelity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Price-to-MSRP ratio against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Logo and tag fidelity, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
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
CREATE TABLE counterfeit_product_detection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE counterfeit_product_detection_detections (
  frame_id TEXT NOT NULL REFERENCES counterfeit_product_detection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE counterfeit_product_detection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Counterfeit Product Detection": Find counterfeit listings using images, text, price and seller signals, supporting brand-owner takedowns with strong evidence. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Trust and safety in marketplaces | Marketplaces face fake reviews, counterfeit goods, seller fraud, return abuse and checkout payment fraud. Attackers adapt, ground truth is partial, and enforcement affects honest sellers and buyers. | Precision matters as much as recall because every false action penalises a real seller or shopper. |
| A catalogue that never stands still | Items are added, go out of stock, change price and spike during sales and seasons. New items have no history (cold start), and a sale can reshuffle popularity within minutes. | Counts built last week can point at items that are gone, and a random split of historical sessions hides this drift. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Logo and tag fidelity | Fine-grained logo similarity to brand references. Visual authenticity. | Leakage risk to design against: Reference set curated by brand. |
| A signal-versus-noise trap in this use case: Brand | The true signal is per-brand verified catalogues and authentication attributes; the common noise is generic fake classifier. | Generic models don't know a brand's logo detail. |

**Ask the experts**

- [ ] What exactly does "Brand-owner evidence packs" mean in practice for counterfeit product detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Logo and tag fidelity" and "Price-to-MSRP ratio", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Counterfeit listing prevalence" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: fakes in training from easy known sellers, and who can confirm the cut-off times and splits?
- [ ] How often does "New fake variant evades model" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Counterfeit | A fake product sold as genuine, a major marketplace trust issue. |
| Attribute extraction | Pulling structured fields such as brand, size and colour from product titles, descriptions and images. |
| Visual search | Finding products from a photograph or image rather than text. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Assortment | The set of products a store or channel chooses to carry. |
| Planogram | A diagram of how products should be arranged on shelves. |
| Shrinkage | Inventory lost to theft, damage or error between purchase and sale. |
| Marketplace seller | A third-party business selling on a platform, whose fairness and quality the platform must manage. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
