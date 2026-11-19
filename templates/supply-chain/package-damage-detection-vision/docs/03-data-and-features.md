# Package Damage Detection: data and feature specification

> Generated from the blueprint `supply-chain/package-damage-detection-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Package Damage Detection · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Package Damage Detection": Detect damaged parcels at hub induction and unloading to attribute liability and trigger repacking or claims early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on staged damage.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Dent and tear detection maps | segmentation of damage | Localisation | Annotation protocol |   |   |   |
| Package type and material | box, polybag, pallet | Context | Classification |   |   |   |
| Tracking across cameras | parcel identity across views | Aggregation | ReID |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Severity | Severity grading tied to claim thresholds | Binary damaged flag | Claims and actions depend on severity |
| Coverage | Multi-angle camera tunnel | Single camera | Damage on hidden faces is missed |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Label colour | none |
| Belt speed fluctuation | process |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Dent and tear detection maps inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: annotation protocol. |
| Package type and material inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: classification. |
| Tracking across cameras inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: reID. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: package_damage_detection_vision_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: dent_and_tear_detection_maps, type: double, nullable: false }
    - { name: package_type_and_material, type: double, nullable: false }
    - { name: tracking_across_cameras, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Dent and tear detection maps and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Package type and material against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Dent and tear detection maps, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE package_damage_detection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE package_damage_detection_detections (
  frame_id TEXT NOT NULL REFERENCES package_damage_detection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE package_damage_detection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Package Damage Detection": Detect damaged parcels at hub induction and unloading to attribute liability and trigger repacking or claims early. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Warehouse and fulfilment operations | Warehouses receive, store, pick, pack and ship. Layout and slotting set walking distance, wave planning groups orders, robots and humans share space, and labour is the main cost. Computer vision reads barcodes, dimensions and damage. | Throughput and labour per order are the business metrics; model accuracy is only useful insofar as it shortens a pick path or avoids a rehandle. |
| Demand is not sales | Recorded sales are capped by what was available. A stock-out, a supplier allocation limit or a late truck means customers who wanted the product did not get it. The demand that would have occurred without the limit is called unconstrained demand; sales are constrained demand. | Training on capped sales teaches the model that demand fell when supply was rationed, which then under-orders and creates the next stock-out. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Dent and tear detection maps | Segmentation of damage. Localisation. | Leakage risk to design against: Annotation protocol. |
| A signal-versus-noise trap in this use case: Severity | The true signal is severity grading tied to claim thresholds; the common noise is binary damaged flag. | Claims and actions depend on severity. |

**Ask the experts**

- [ ] What exactly does "Conveyor speed 2 m/s" mean in practice for package damage detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Dent and tear detection maps" and "Package type and material", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Damage claims resolved with evidence" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on staged damage, and who can confirm the cut-off times and splits?
- [ ] How often does "Lighting changes at shift change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Barcode / OCR | Reading identifiers and printed text from parcels so they can be sorted. |
| Proof of delivery | Evidence, often a photo or signature, that a parcel reached the customer. |
| HS code | Harmonised System code that classifies traded goods for customs duties and rules. |
| Bin packing | Fitting items into the fewest containers or trucks subject to size and weight. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
