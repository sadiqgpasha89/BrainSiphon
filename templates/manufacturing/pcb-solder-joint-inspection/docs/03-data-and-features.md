# PCB Solder Joint Inspection: data and feature specification

> Generated from the blueprint `manufacturing/pcb-solder-joint-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** PCB Solder Joint Inspection · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "PCB Solder Joint Inspection": Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Trusting machine rejects as labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Joint shape and volume | 3D height map statistics per joint | Core quality signal | Needs calibrated height |   |   |   |
| Component offset and rotation | placement offsets against the pad | Placement errors | From the placement file |   |   |   |
| Stencil and paste measurement | paste volume from the printer inspection | Upstream cause | Join by board id |   |   |   |
| Reflow profile summary | peak temperature and time above liquidus | Process cause | From the oven log |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Test results and repair data linked to joint position | Machine reject flags | Machines over-reject for marginal joints |
| Variation | Components from many suppliers and reels | A single golden board | Real boards differ by reel and lot |
| Action | Repair guidance with location | A reject flag | Repair stations need to know which joint |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Board serial number | an identifier |
| Operator on shift | not a defect driver |
| Silkscreen colour | no link to quality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Joint shape and volume inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: needs calibrated height. |
| Component offset and rotation inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the placement file. |
| Stencil and paste measurement inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: join by board id. |
| Reflow profile summary inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the oven log. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: pcb_solder_joint_inspection_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: joint_shape_and_volume, type: double, nullable: false }
    - { name: component_offset_and_rotation, type: double, nullable: false }
    - { name: stencil_and_paste_measurement, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Joint shape and volume and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Component offset and rotation against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Joint shape and volume, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE pcb_solder_joint_inspection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE pcb_solder_joint_inspection_detections (
  frame_id TEXT NOT NULL REFERENCES pcb_solder_joint_inspection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE pcb_solder_joint_inspection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "PCB Solder Joint Inspection": Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Joint shape and volume | 3D height map statistics per joint. Core quality signal. | Leakage risk to design against: Needs calibrated height. |
| A signal-versus-noise trap in this use case: Label | The true signal is test results and repair data linked to joint position; the common noise is machine reject flags. | Machines over-reject for marginal joints. |

**Ask the experts**

- [ ] What exactly does "Decision within 80 ms per board panel region" mean in practice for pcb solder joint inspection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Joint shape and volume" and "Component offset and rotation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Boards failing at test" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: trusting machine rejects as labels, and who can confirm the cut-off times and splits?
- [ ] How often does "New package type" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Golden sample | A reference part known to be good. |
| Rework | Fixing a defective part so it can be sold. |
| AOI | Automated optical inspection of parts or boards. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| Historian | A database for time-stamped sensor data from plants. |
| Cycle time | The time to complete one unit of work at a station. |
| First pass yield | The share of units that pass without rework. |
| RUL | Remaining useful life: the time before a component should be replaced. |
| Vibration analysis | Using vibration signals to detect machine faults. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
