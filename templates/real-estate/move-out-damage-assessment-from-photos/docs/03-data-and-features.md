# Move-Out Damage Assessment from Photos: data and feature specification

> Generated from the blueprint `real-estate/move-out-damage-assessment-from-photos` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Move-Out Damage Assessment from Photos · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Move-Out Damage Assessment from Photos": Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Posed photos taken by a careful inspector are cleaner than tenants' own pictures.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Change detection | pixel-level difference between aligned move-in and move-out photos after exposure normalisation | Finds what has changed | Lighting changes look like damage, so normalise first |   |   |   |
| Damage class | classifier probability for stain, hole, scratch, crack or burn | Gives a type that links to a repair | Rare classes have few examples, so check per class |   |   |   |
| Age of fixture | years since the fixture, flooring or paint was installed or last renewed | Older items wear more, so the allowance is larger | Records are incomplete, so use building age as a fallback |   |   |   |
| Repair cost table | local labour and material rates per repair type | Turns a finding into a figure | Rates vary by contractor and season, so use a range |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Wear | Normal wear separated from damage by age and type | Any change between photos | Deposits cannot cover fair wear and tear, and a model that flags all change overcharges tenants |
| Alignment | Comparing the same view taken from the same place | Photos from different angles | Misaligned photos show differences that are not real |
| Cost | A repair cost estimate for the identified damage | A damage flag with no cost | Deductions depend on cost, and a flag alone does not support a figure |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Furniture | Removed or moved between photos and should not be read as damage |
| Lighting | Varies by time of day and window and should be normalised |
| Camera | Different phones change colour and sharpness and not the condition |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Change detection inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: lighting changes look like damage, so normalise first. |
| Damage class inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: rare classes have few examples, so check per class. |
| Age of fixture inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: records are incomplete, so use building age as a fallback. |
| Repair cost table inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: rates vary by contractor and season, so use a range. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: move_out_damage_assessment_from_photos_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: change_detection, type: double, nullable: false }
    - { name: damage_class, type: double, nullable: false }
    - { name: age_of_fixture, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Change detection and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Damage class against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Change detection, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE move_out_damage_assessment_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE move_out_damage_assessment_detections (
  frame_id TEXT NOT NULL REFERENCES move_out_damage_assessment_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE move_out_damage_assessment_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Move-Out Damage Assessment from Photos": Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Change detection | Pixel-level difference between aligned move-in and move-out photos after exposure normalisation. Finds what has changed. | Leakage risk to design against: Lighting changes look like damage, so normalise first. |
| A signal-versus-noise trap in this use case: Wear | The true signal is normal wear separated from damage by age and type; the common noise is any change between photos. | Deposits cannot cover fair wear and tear, and a model that flags all change overcharges tenants. |

**Ask the experts**

- [ ] What exactly does "A tenant can dispute any deduction with the same evidence the manager sees" mean in practice for move-out damage assessment from photos: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Change detection" and "Damage class", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Disputes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: posed photos taken by a careful inspector are cleaner than tenants' own pictures, and who can confirm the cut-off times and splits?
- [ ] How often does "Different lighting" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Security deposit | Money held against damage or unpaid rent, returned after deductions at move-out. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Assessed value | The value a tax authority assigns to a property for property tax. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Bill of quantities | A list of materials and work items with quantities, used for tender and cost control. |
| COD | Coefficient of dispersion: a measure of how uniformly assessments relate to sale prices; lower is more uniform. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
