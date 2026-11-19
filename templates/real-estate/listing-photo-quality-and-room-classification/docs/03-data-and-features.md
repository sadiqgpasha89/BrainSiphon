# Listing Photo Quality & Room Classification: data and feature specification

> Generated from the blueprint `real-estate/listing-photo-quality-and-room-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Photo Quality & Room Classification · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Listing Photo Quality & Room Classification": Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training mostly on professional photos hides failures on the phone pictures that most agents upload.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Room class probability | softmax output of the vision model for each room type | Drives gallery ordering and flags missing rooms | Rare rooms such as utility or study are under-represented, so check per-class recall |   |   |   |
| Blur score | variance of the Laplacian of the grey image | Sharp images have strong edges, and a low value means a blurred photo | Depends on image size, so compute at a fixed resolution |   |   |   |
| Exposure histogram | share of pixels clipped in highlights and in shadows | Over or under-exposure is a fixable defect | High-dynamic-range photos look clipped but are fine, so condition on the scene type |   |   |   |
| Duplicate similarity | perceptual hash distance to other photos in the same listing | Near-duplicate photos waste gallery slots | Crops and filters change the hash, so use an embedding distance as a second check |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Room | Room type predicted from what the image contains | The file name or the order of upload | Agents upload in arbitrary order, so position carries no information about the room |
| Quality | Technical quality measured by blur, exposure and tilt | Aesthetic opinions about taste | Aesthetic labels disagree between raters and teach the model fashion, not a defect an agent can fix |
| Privacy | Detect and blur identifiable people and plates before storage | Leave privacy to a later review | A leaked face or plate is a legal and trust problem that cannot be undone once published |

## Features to drop

| Feature | Why it is noise |
|---|---|
| File size | Depends on compression settings and the upload client and says nothing about the scene |
| Camera brand | Irrelevant to the room or its quality once exposure and blur are measured |
| Upload time | Reflects when the agent worked, not the room or the image |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Room class probability inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: rare rooms such as utility or study are under-represented, so check per-class recall. |
| Blur score inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: depends on image size, so compute at a fixed resolution. |
| Exposure histogram inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: high-dynamic-range photos look clipped but are fine, so condition on the scene type. |
| Duplicate similarity inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: crops and filters change the hash, so use an embedding distance as a second check. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: listing_photo_quality_and_room_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: room_class_probability, type: double, nullable: false }
    - { name: blur_score, type: double, nullable: false }
    - { name: exposure_histogram, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Room class probability and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Blur score against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Room class probability, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MedMNIST | https://medmnist.com/ | CC BY 4.0 per dataset (see the site) | Standardised small medical image datasets for classification and segmentation across modalities | Low resolution; for prototyping, not clinical performance claims. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE listing_photo_quality_and_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE listing_photo_quality_and_detections (
  frame_id TEXT NOT NULL REFERENCES listing_photo_quality_and_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE listing_photo_quality_and_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Listing Photo Quality & Room Classification": Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Listing, search and the buyer funnel | A buyer discovers listings on portals, saves and shares them, enquires, views, makes an offer and goes through a mortgage and a closing. Agents hold the listing relationship, and the portal sees search and engagement behaviour but rarely the final sale. | Engagement is a proxy; the outcome you care about (a sale, a lease) is rare, delayed and often outside the portal's data. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Room class probability | Softmax output of the vision model for each room type. Drives gallery ordering and flags missing rooms. | Leakage risk to design against: Rare rooms such as utility or study are under-represented, so check per-class recall. |
| A signal-versus-noise trap in this use case: Room | The true signal is room type predicted from what the image contains; the common noise is the file name or the order of upload. | Agents upload in arbitrary order, so position carries no information about the room. |

**Ask the experts**

- [ ] What exactly does "Under 80 ms per image at the 99th percentile so upload is not slowed" mean in practice for listing photo quality & room classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Room class probability" and "Blur score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Listing engagement" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training mostly on professional photos hides failures on the phone pictures that most agents upload, and who can confirm the cut-off times and splits?
- [ ] How often does "Floor plans in the gallery" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Days on market | The number of days a listing takes to go under contract. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Assessed value | The value a tax authority assigns to a property for property tax. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
