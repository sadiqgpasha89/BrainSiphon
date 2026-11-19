# Visual Quality Inspection on the Production Line: data and feature specification

> Generated from the blueprint `supply-chain/visual-quality-inspection-line` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Visual Quality Inspection on the Production Line · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Visual Quality Inspection on the Production Line": Detect surface defects and assembly errors on products at line speed with minimal false rejects. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test defects staged not natural.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Anomaly score map | patch-feature distance to normal | Localises defects | Normal set coverage |   |   |   |
| Part pose and alignment | registration residual | Reduces false alarms | Fixtures |   |   |   |
| Defect-class classifier | few-shot classes | Root cause | Labels |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Data | Anomaly detection trained on good samples | Supervised defect classifier | Defect examples are rare and diverse |
| Optics | Lighting and camera design first | Algorithm fixes for bad imaging | Garbage imaging limits any model |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Conveyor vibration noise | environment |
| Background texture | fixture |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Anomaly score map inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: normal set coverage. |
| Part pose and alignment inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: fixtures. |
| Defect-class classifier inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: labels. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: visual_quality_inspection_line_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: anomaly_score_map, type: double, nullable: false }
    - { name: part_pose_and_alignment, type: double, nullable: false }
    - { name: defect_class_classifier, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Anomaly score map and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Part pose and alignment against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Anomaly score map, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE visual_quality_inspection_line_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE visual_quality_inspection_line_detections (
  frame_id TEXT NOT NULL REFERENCES visual_quality_inspection_line_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE visual_quality_inspection_line_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Visual Quality Inspection on the Production Line": Detect surface defects and assembly errors on products at line speed with minimal false rejects. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| From forecast error to inventory | Safety stock buffers against forecast error and supplier variability: roughly a service-level factor times the standard deviation of forecast error times the square root of lead time. Better forecasts therefore directly cut the inventory needed for the same service level, and biased forecasts create systematic over- or under-stocking. | Business value is measured in stock, stock-outs and expediting, not in MAPE, so tie accuracy gains back to those. |
| Sustainability and emissions | Shippers estimate and report carbon emissions per shipment from mode, distance, load factor and fuel. Estimates have wide uncertainty, and routing, mode choice and consolidation can reduce emissions. | Reporting standards require traceable methods, so an estimate must be reproducible from its inputs. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Anomaly score map | Patch-feature distance to normal. Localises defects. | Leakage risk to design against: Normal set coverage. |
| A signal-versus-noise trap in this use case: Data | The true signal is anomaly detection trained on good samples; the common noise is supervised defect classifier. | Defect examples are rare and diverse. |

**Ask the experts**

- [ ] What exactly does "Line speed of 10 parts/s" mean in practice for visual quality inspection on the production line: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Anomaly score map" and "Part pose and alignment", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Escape rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test defects staged not natural, and who can confirm the cut-off times and splits?
- [ ] How often does "Product variant change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Changeover / setup | The time and cost of switching a machine from one product to another. |
| Bill of materials (BOM) | The list of parts and quantities needed to make a product. |
| Capacity constraint | A limit on how much can be processed, stored or moved in a period. |
| Control tower | A central view of a supply chain's events and exceptions, used to react to disruptions. |
| Proof of delivery | Evidence, often a photo or signature, that a parcel reached the customer. |
| Barcode / OCR | Reading identifiers and printed text from parcels so they can be sorted. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
