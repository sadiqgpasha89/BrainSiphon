# PPE Compliance Zone Statistics: data and feature specification

> Generated from the blueprint `manufacturing/ppe-compliance-zone-statistics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** PPE Compliance Zone Statistics · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "PPE Compliance Zone Statistics": Estimate protective equipment compliance by zone and shift from cameras in aggregate, so EHS targets training and signage without monitoring individuals. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Individual enforcement.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| PPE item detection rate | share of detected people with each required item | Core statistic | Per zone |   |   |   |
| Detection confidence | confidence of the PPE classifier | Filters weak calls | Calibrated |   |   |   |
| Zone and time bucket | where and when | Targeting | Aggregated |   |   |   |
| Lighting and occlusion | visibility indicators | Quality of the estimate | From the camera |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Purpose | Aggregate compliance rates to guide training | Individual enforcement | Individual enforcement harms trust and breaks agreements |
| Method | Anonymised detections with counts | Stored video | Stored video is a privacy and security liability |
| Action | Zone and time insights for EHS | Alerts to supervisors about named workers | Named alerts are surveillance |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Worker identity | privacy risk |
| Clothing brand | irrelevant |
| Face features | prohibited |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| PPE item detection rate inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: per zone. |
| Detection confidence inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibrated. |
| Zone and time bucket inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: aggregated. |
| Lighting and occlusion inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the camera. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ppe_compliance_zone_statistics_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ppe_item_detection_rate, type: double, nullable: false }
    - { name: detection_confidence, type: double, nullable: false }
    - { name: zone_and_time_bucket, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on PPE item detection rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Detection confidence against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as PPE item detection rate, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE ppe_compliance_zone_statistics_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE ppe_compliance_zone_statistics_detections (
  frame_id TEXT NOT NULL REFERENCES ppe_compliance_zone_statistics_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE ppe_compliance_zone_statistics_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "PPE Compliance Zone Statistics": Estimate protective equipment compliance by zone and shift from cameras in aggregate, so EHS targets training and signage without monitoring individuals. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Workers are not the unit of analysis | Cameras and wearables on the floor raise privacy and labour-law concerns. Safety analytics should detect hazards and conditions, not rank individual workers. | Monitoring individuals harms trust and can breach works council agreements. |
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Operational technology has its own safety and network rules | Control systems use PLCs, SCADA and industrial protocols on segmented networks. Changing them can stop production or hurt people, so analytics read data and recommend, while closed-loop control stays with validated systems. | An AI system that writes to a controller needs the same change control as any safety-related modification. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: PPE item detection rate | Share of detected people with each required item. Core statistic. | Leakage risk to design against: Per zone. |
| A signal-versus-noise trap in this use case: Purpose | The true signal is aggregate compliance rates to guide training; the common noise is individual enforcement. | Individual enforcement harms trust and breaks agreements. |

**Ask the experts**

- [ ] What exactly does "Outputs are zone-level counts and never individual alerts" mean in practice for ppe compliance zone statistics: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "PPE item detection rate" and "Detection confidence", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Compliance rate in targeted zones" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: individual enforcement, and who can confirm the cut-off times and splits?
- [ ] How often does "Partial occlusion" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| Historian | A database for time-stamped sensor data from plants. |
| FMEA | Failure mode and effects analysis: a structured review of how a design or process can fail. |
| Edge gateway | A device that collects and pre-processes plant data near the machines. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| PLC | Programmable logic controller: a rugged computer that controls machines. |
| OPC UA | A standard protocol for exchanging industrial data. |
| Cycle time | The time to complete one unit of work at a station. |
| Rework | Fixing a defective part so it can be sold. |
| First pass yield | The share of units that pass without rework. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Re-identification | Recognising the same person or object across different camera views. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
