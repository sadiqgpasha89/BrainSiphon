# Visual Defect Inspection: data and feature specification

> Generated from the blueprint `manufacturing/visual-defect-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Visual Defect Inspection · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Visual Defect Inspection": Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on operator rejects as truth.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Defect probability map | model score per image region | Locates and sizes the defect | Calibrate per defect class |   |   |   |
| Part pose and fixture state | position and orientation of the part in frame | Reduces false alarms | From the fixture sensors |   |   |   |
| Lighting and lens drift indicators | image brightness and focus statistics | Warns of camera drift | Track per camera |   |   |   |
| Upstream process context | tool, material lot and recent process alarms | Explains the defect | Join from MES by part id |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Defects confirmed by quality engineers with type and location | Operator rejects at the line | Operators reject for many reasons including doubt |
| Data | Images from every shift, lot and lighting condition | One clean batch | Models trained on a good week fail on a bad lens |
| Threshold | Set from the cost of an escape against a false reject | Accuracy | Accuracy hides the rare defects that matter |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Operator name | not a defect cause |
| Image file timestamp alone | no link to the defect |
| Background clutter | an acquisition artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Defect probability map inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibrate per defect class. |
| Part pose and fixture state inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the fixture sensors. |
| Lighting and lens drift indicators inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: track per camera. |
| Upstream process context inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: join from MES by part id. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: visual_defect_inspection_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: defect_probability_map, type: double, nullable: false }
    - { name: part_pose_and_fixture_state, type: double, nullable: false }
    - { name: lighting_and_lens_drift_indicators, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Defect probability map and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Part pose and fixture state against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Defect probability map, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepFashion | https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html | Non-commercial research (see the page) | Over 800,000 fashion images with categories, attributes, landmarks and consumer-to-shop pairs | Non-commercial; fashion-only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE visual_defect_inspection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE visual_defect_inspection_detections (
  frame_id TEXT NOT NULL REFERENCES visual_defect_inspection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE visual_defect_inspection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Visual Defect Inspection": Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Defect probability map | Model score per image region. Locates and sizes the defect. | Leakage risk to design against: Calibrate per defect class. |
| A signal-versus-noise trap in this use case: Label | The true signal is defects confirmed by quality engineers with type and location; the common noise is operator rejects at the line. | Operators reject for many reasons including doubt. |

**Ask the experts**

- [ ] What exactly does "Decision within 80 ms at line speed" mean in practice for visual defect inspection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Defect probability map" and "Part pose and fixture state", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Customer escapes per million" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on operator rejects as truth, and who can confirm the cut-off times and splits?
- [ ] How often does "Lighting change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| AOI | Automated optical inspection of parts or boards. |
| Historian | A database for time-stamped sensor data from plants. |
| Rework | Fixing a defective part so it can be sold. |
| First pass yield | The share of units that pass without rework. |
| Lot traceability | Tracking which materials and settings went into each lot. |
| Six Sigma | A method for reducing defects through data. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| Scrap | Material or parts that cannot be sold. |
| SPC | Statistical process control: using control charts to detect process drift. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Distribution shift | A change in the data a model sees compared with training. |
| Multiple-instance learning | Learning from a bag of patches with only a bag-level label, as in whole-slide pathology. |
