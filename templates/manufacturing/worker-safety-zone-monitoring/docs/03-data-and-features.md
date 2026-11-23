# Worker Safety Zone Monitoring: data and feature specification

> Generated from the blueprint `manufacturing/worker-safety-zone-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Worker Safety Zone Monitoring · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Worker Safety Zone Monitoring": Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replacing certified interlocks.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Person detection in zone | whether a person-shaped object is inside the zone | Core trigger | Confidence calibrated |   |   |   |
| Object speed and direction | movement of vehicles and machine parts | Collision risk | From tracking |   |   |   |
| Zone state | the machine state and the allowed zone | Context | From the controller |   |   |   |
| Visibility conditions | lighting and occlusion indicators | Reliability | From the camera |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Role | An extra warning layer above certified interlocks | The primary safety function | An unvalidated model cannot be the guard |
| Privacy | Anonymised person detection by zone | Identified workers | Surveillance of individuals harms trust |
| Metric | Recall of people in the zone at a fixed false alarm rate | Overall accuracy | Missed people are what matters |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Worker identity | privacy risk and no safety value |
| Clothing colour alone | weak link |
| Shift label alone | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Person detection in zone inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: confidence calibrated. |
| Object speed and direction inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from tracking. |
| Zone state inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the controller. |
| Visibility conditions inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the camera. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: worker_safety_zone_monitoring_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: person_detection_in_zone, type: double, nullable: false }
    - { name: object_speed_and_direction, type: double, nullable: false }
    - { name: zone_state, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Person detection in zone and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Object speed and direction against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Person detection in zone, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE worker_safety_zone_monitoring_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE worker_safety_zone_monitoring_detections (
  frame_id TEXT NOT NULL REFERENCES worker_safety_zone_monitoring_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE worker_safety_zone_monitoring_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Worker Safety Zone Monitoring": Detect people entering hazardous zones near machines and vehicles and trigger warnings or a safe slow-down through the certified safety system, without identifying individuals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Workers are not the unit of analysis | Cameras and wearables on the floor raise privacy and labour-law concerns. Safety analytics should detect hazards and conditions, not rank individual workers. | Monitoring individuals harms trust and can breach works council agreements. |
| Operational technology has its own safety and network rules | Control systems use PLCs, SCADA and industrial protocols on segmented networks. Changing them can stop production or hurt people, so analytics read data and recommend, while closed-loop control stays with validated systems. | An AI system that writes to a controller needs the same change control as any safety-related modification. |
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Person detection in zone | Whether a person-shaped object is inside the zone. Core trigger. | Leakage risk to design against: Confidence calibrated. |
| A signal-versus-noise trap in this use case: Role | The true signal is an extra warning layer above certified interlocks; the common noise is the primary safety function. | An unvalidated model cannot be the guard. |

**Ask the experts**

- [ ] What exactly does "The certified safety controller remains the safety function and the model is an additional layer" mean in practice for worker safety zone monitoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Person detection in zone" and "Object speed and direction", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Near misses" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: replacing certified interlocks, and who can confirm the cut-off times and splits?
- [ ] How often does "Poor lighting" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Safety interlock | A device that stops a machine when a guard is open. |
| PLC | Programmable logic controller: a rugged computer that controls machines. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| FMEA | Failure mode and effects analysis: a structured review of how a design or process can fail. |
| Historian | A database for time-stamped sensor data from plants. |
| Vibration analysis | Using vibration signals to detect machine faults. |
| CMMS | Computerised maintenance management system for work orders and assets. |
| Work order | An instruction to produce or repair something. |
| Lockout tagout | A procedure to isolate energy before maintenance. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
