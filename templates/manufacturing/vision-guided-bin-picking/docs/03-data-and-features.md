# Vision-Guided Bin Picking: data and feature specification

> Generated from the blueprint `manufacturing/vision-guided-bin-picking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vision-Guided Bin Picking · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Vision-Guided Bin Picking": Locate and grasp randomly placed parts in bins using 3D vision so robot cells can feed machines without precise fixturing. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on annotation only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Pose estimate confidence | confidence of the part pose | Grasp decision | Calibrated |   |   |   |
| Grasp reachability | whether the gripper can reach without collision | Feasibility | From the cell model |   |   |   |
| Part overlap and occlusion | share of the part visible | Failure risk | From the point cloud |   |   |   |
| Bin fill level | parts remaining | Strategy switch | From the cloud |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Successful grasps and measured poses | Annotated images only | Image annotation does not equal a good grasp |
| Safety | Motion planning with collision and speed limits in the controller | Model-driven motion | A model cannot guarantee clearance |
| Variation | Parts in all lighting, orientations and bin fill levels | A tidy demo bin | Real bins are messy |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Operator name | not a driver |
| Part colour alone | lighting effect |
| Image timestamp | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Pose estimate confidence inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibrated. |
| Grasp reachability inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the cell model. |
| Part overlap and occlusion inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the point cloud. |
| Bin fill level inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the cloud. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: vision_guided_bin_picking_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: pose_estimate_confidence, type: double, nullable: false }
    - { name: grasp_reachability, type: double, nullable: false }
    - { name: part_overlap_and_occlusion, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Pose estimate confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Grasp reachability against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Pose estimate confidence, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE vision_guided_bin_picking_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE vision_guided_bin_picking_detections (
  frame_id TEXT NOT NULL REFERENCES vision_guided_bin_picking_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE vision_guided_bin_picking_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Vision-Guided Bin Picking": Locate and grasp randomly placed parts in bins using 3D vision so robot cells can feed machines without precise fixturing. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Operational technology has its own safety and network rules | Control systems use PLCs, SCADA and industrial protocols on segmented networks. Changing them can stop production or hurt people, so analytics read data and recommend, while closed-loop control stays with validated systems. | An AI system that writes to a controller needs the same change control as any safety-related modification. |
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Pose estimate confidence | Confidence of the part pose. Grasp decision. | Leakage risk to design against: Calibrated. |
| A signal-versus-noise trap in this use case: Label | The true signal is successful grasps and measured poses; the common noise is annotated images only. | Image annotation does not equal a good grasp. |

**Ask the experts**

- [ ] What exactly does "Pose estimate within 80 ms" mean in practice for vision-guided bin picking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Pose estimate confidence" and "Grasp reachability", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Picks per hour" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on annotation only, and who can confirm the cut-off times and splits?
- [ ] How often does "Reflective parts" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| PLC | Programmable logic controller: a rugged computer that controls machines. |
| Historian | A database for time-stamped sensor data from plants. |
| FMEA | Failure mode and effects analysis: a structured review of how a design or process can fail. |
| MES | Manufacturing execution system: software that tracks production on the shop floor. |
| Cycle time | The time to complete one unit of work at a station. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| Safety interlock | A device that stops a machine when a guard is open. |
| Edge gateway | A device that collects and pre-processes plant data near the machines. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Dice coefficient | An overlap score between two regions, widely used for segmentation. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
