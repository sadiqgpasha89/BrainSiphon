# Product Matching & Deduplication: data and feature specification

> Generated from the blueprint `retail/product-matching-and-deduplication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Product Matching & Deduplication · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Product Matching & Deduplication": Identify identical products across sellers and sources to merge listings, power price comparison and avoid catalogue bloat. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Positive pairs mined from GTIN only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| GTIN or MPN agreement | exact or normalised identifier match | Strongest evidence | Validate check digits |   |   |   |
| Attribute conflict flags | mismatch in size, colour, pack count | Variant separation | Parsed attributes only |   |   |   |
| Image embedding similarity | multimodal similarity | Visual identity | Normalise backgrounds |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Blocking | Learned blocking keys and ANN candidate generation | All-pairs comparison | N-squared cannot scale to 200M items |
| Identity | Hard identifiers (GTIN, MPN) trump fuzzy similarity | Text similarity alone | Variants (colour, size) look identical in text |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Seller name | irrelevant to product identity |
| Listing date | arbitrary |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| GTIN or MPN agreement inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: validate check digits. |
| Attribute conflict flags inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: parsed attributes only. |
| Image embedding similarity inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: normalise backgrounds. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: product_matching_and_deduplication_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: gtin_or_mpn_agreement, type: double, nullable: false }
    - { name: attribute_conflict_flags, type: double, nullable: false }
    - { name: image_embedding_similarity, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on GTIN or MPN agreement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Attribute conflict flags against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as GTIN or MPN agreement, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Open Graph Benchmark | https://ogb.stanford.edu/ | Per-dataset terms (see the site) | Large realistic graph datasets for node, link and graph prediction with standard splits | Academic graphs; business graphs are messier. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE product_matching_and_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE product_matching_and_detections (
  frame_id TEXT NOT NULL REFERENCES product_matching_and_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE product_matching_and_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Product Matching & Deduplication": Identify identical products across sellers and sources to merge listings, power price comparison and avoid catalogue bloat. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Trust and safety in marketplaces | Marketplaces face fake reviews, counterfeit goods, seller fraud, return abuse and checkout payment fraud. Attackers adapt, ground truth is partial, and enforcement affects honest sellers and buyers. | Precision matters as much as recall because every false action penalises a real seller or shopper. |
| A catalogue that never stands still | Items are added, go out of stock, change price and spike during sales and seasons. New items have no history (cold start), and a sale can reshuffle popularity within minutes. | Counts built last week can point at items that are gone, and a random split of historical sessions hides this drift. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: GTIN or MPN agreement | Exact or normalised identifier match. Strongest evidence. | Leakage risk to design against: Validate check digits. |
| A signal-versus-noise trap in this use case: Blocking | The true signal is learned blocking keys and ANN candidate generation; the common noise is all-pairs comparison. | N-squared cannot scale to 200M items. |

**Ask the experts**

- [ ] What exactly does "Billions of candidate pairs" mean in practice for product matching & deduplication: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "GTIN or MPN agreement" and "Attribute conflict flags", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Duplicate rate in catalogue" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: positive pairs mined from GTIN only, and who can confirm the cut-off times and splits?
- [ ] How often does "Bundle vs single item" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Product matching | Deciding whether two listings describe the same product. |
| Attribute extraction | Pulling structured fields such as brand, size and colour from product titles, descriptions and images. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| Assortment | The set of products a store or channel chooses to carry. |
| Counterfeit | A fake product sold as genuine, a major marketplace trust issue. |
| Visual search | Finding products from a photograph or image rather than text. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| OCR / text detection | Finding and reading text in images. |
| Re-identification | Recognising the same person or object across different camera views. |
| Perceptual loss | A loss that compares images using the features of a pretrained network instead of raw pixels. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
