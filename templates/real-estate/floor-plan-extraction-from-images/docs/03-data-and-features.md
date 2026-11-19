# Floor-Plan Extraction from Images: data and feature specification

> Generated from the blueprint `real-estate/floor-plan-extraction-from-images` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Floor-Plan Extraction from Images · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Floor-Plan Extraction from Images": Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on clean CAD exports hides failures on the hand-drawn and scanned plans that most listings contain.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Wall segmentation | intersection-over-union of the predicted wall mask against labelled plans | The base of the geometry | Clutter such as furniture symbols and hatching confuses the mask, so evaluate per drawing style |   |   |   |
| Dimension OCR | recognised numbers and units next to walls, converted to metres | Gives the scale for the whole plan | A misread digit changes the scale by ten, so validate against the stated area |   |   |   |
| Room label OCR | recognised room names mapped to a fixed room taxonomy | Adds meaning to the geometry | Names are in many languages and abbreviations, so normalise by locale |   |   |   |
| Area consistency | sum of room areas divided by the stated total area | A cheap check that catches both OCR and geometry errors | Stated totals include or exclude walls and balconies, so allow for the convention |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Geometry | Walls, doors and rooms extracted as closed vector polygons | Pixel masks alone | Search, valuation and 3D tours need vectors with dimensions, not a picture of walls |
| Scale | Scale recovered from printed dimension text or a known reference | An assumed fixed scale | One wrong scale multiplies every area, and the error is invisible until it is compared with the stated area |
| Variety | Training across many drawing styles, scanners and languages | A single template style | A model trained on clean architectural plans fails on agent-drawn and photographed plans |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Colour | A style choice of the drawing that does not change the layout |
| Watermark | Overlaid text that the model should ignore and not read as a label |
| Compass | Orientation marks carry no geometry or area information |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Wall segmentation inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: clutter such as furniture symbols and hatching confuses the mask, so evaluate per drawing style. |
| Dimension OCR inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: A misread digit changes the scale by ten, so validate against the stated area. |
| Room label OCR inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: names are in many languages and abbreviations, so normalise by locale. |
| Area consistency inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: stated totals include or exclude walls and balconies, so allow for the convention. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: floor_plan_extraction_from_images_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: wall_segmentation, type: double, nullable: false }
    - { name: dimension_ocr, type: double, nullable: false }
    - { name: room_label_ocr, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Wall segmentation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Dimension OCR against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Wall segmentation, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE floor_plan_extraction_from_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE floor_plan_extraction_from_detections (
  frame_id TEXT NOT NULL REFERENCES floor_plan_extraction_from_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE floor_plan_extraction_from_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Floor-Plan Extraction from Images": Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Wall segmentation | Intersection-over-union of the predicted wall mask against labelled plans. The base of the geometry. | Leakage risk to design against: Clutter such as furniture symbols and hatching confuses the mask, so evaluate per drawing style. |
| A signal-versus-noise trap in this use case: Geometry | The true signal is walls, doors and rooms extracted as closed vector polygons; the common noise is pixel masks alone. | Search, valuation and 3D tours need vectors with dimensions, not a picture of walls. |

**Ask the experts**

- [ ] What exactly does "Total area within 3 percent of the stated area on supported plans" mean in practice for floor-plan extraction from images: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Wall segmentation" and "Dimension OCR", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Manual tracing hours saved" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on clean CAD exports hides failures on the hand-drawn and scanned plans that most listings contain, and who can confirm the cut-off times and splits?
- [ ] How often does "Hand-drawn plans" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| AVM | Automated valuation model: software that estimates a property's market value from data instead of an on-site appraisal. |
| Comparable (comp) | A recent sale of a similar nearby property used to estimate the value of the subject property. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| LTV | Loan-to-value ratio: loan amount divided by property value. |
| Days on market | The number of days a listing takes to go under contract. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| OCR / text detection | Finding and reading text in images. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Dice coefficient | An overlap score between two regions, widely used for segmentation. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
