# Roof Condition from Aerial Imagery: data and feature specification

> Generated from the blueprint `real-estate/roof-condition-from-aerial-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Roof Condition from Aerial Imagery · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Roof Condition from Aerial Imagery": Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: The date of the imagery rarely matches the date of the decision, so errors rise in real use.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Roof segmentation | intersection-over-union of the predicted roof mask with labelled outlines | The base for every other measure | Shadows and tree edges confuse the mask |   |   |   |
| Material class | predicted material from texture, such as tile, metal, asphalt or flat membrane | Material affects life expectancy and risk | Rare materials are under-represented |   |   |   |
| Damage score | model score for missing tiles, staining, patching and sagging | The direct condition signal | Resolution limits what the model can see |   |   |   |
| Image age | months since the image capture date | Tells the user how far to trust the grade | Metadata may be wrong, so validate |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Material | The roof material recognised by texture and pattern | The colour of the roof | Colour misleads, since weathering turns many materials grey and paint changes it |
| Condition | A condition grade on a scale with defined levels | A binary good or bad flag | The grade drives action, and a binary flag does not separate a minor repair from a replacement |
| Date | The age of the image shown with the grade | Assuming the latest image is current | A stale image misses recent repairs and recent storm damage |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Image tile | A division of the image that has no meaning for the roof |
| Sensor | The camera type changes appearance but not the roof condition |
| Cloud | Cloud shadow affects the image and not the condition of the roof |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Roof segmentation inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: shadows and tree edges confuse the mask. |
| Material class inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rare materials are under-represented. |
| Damage score inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: resolution limits what the model can see. |
| Image age inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: metadata may be wrong, so validate. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: roof_condition_from_aerial_imagery_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: roof_segmentation, type: double, nullable: false }
    - { name: material_class, type: double, nullable: false }
    - { name: damage_score, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Roof segmentation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Material class against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Roof segmentation, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MedMNIST | https://medmnist.com/ | CC BY 4.0 per dataset (see the site) | Standardised small medical image datasets for classification and segmentation across modalities | Low resolution; for prototyping, not clinical performance claims. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE roof_condition_from_aerial_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE roof_condition_from_aerial_detections (
  frame_id TEXT NOT NULL REFERENCES roof_condition_from_aerial_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE roof_condition_from_aerial_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Roof Condition from Aerial Imagery": Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Climate, flood and property risk | Properties face flood, wildfire, heat and wind risk that depends on elevation, drainage, vegetation and building construction, and on the climate scenario chosen. Lenders and insurers price and limit exposure, and buyers increasingly ask for property-level scores. | Scores must state the scenario, the date of the hazard data and the uncertainty, because they affect prices and insurability. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Roof segmentation | Intersection-over-union of the predicted roof mask with labelled outlines. The base for every other measure. | Leakage risk to design against: Shadows and tree edges confuse the mask. |
| A signal-versus-noise trap in this use case: Material | The true signal is the roof material recognised by texture and pattern; the common noise is the colour of the roof. | Colour misleads, since weathering turns many materials grey and paint changes it. |

**Ask the experts**

- [ ] What exactly does "The date of the imagery is shown with every grade" mean in practice for roof condition from aerial imagery: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Roof segmentation" and "Material class", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Inspection avoided" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: the date of the imagery rarely matches the date of the decision, so errors rise in real use, and who can confirm the cut-off times and splits?
- [ ] How often does "Tree cover" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Cap-ex | Capital expenditure on improving or replacing building components, as distinct from routine repairs. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Redlining | Denying or worsening services in certain areas based on the demographics of the area. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Bill of quantities | A list of materials and work items with quantities, used for tender and cost control. |
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Dice coefficient | An overlap score between two regions, widely used for segmentation. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
