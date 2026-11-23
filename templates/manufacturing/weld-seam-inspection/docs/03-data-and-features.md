# Weld Seam Inspection: data and feature specification

> Generated from the blueprint `manufacturing/weld-seam-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Weld Seam Inspection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Weld Seam Inspection": Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using visual judgement as strength labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Bead geometry score | width, height and continuity from the image | Visible defects | Camera calibration needed |   |   |   |
| Current and voltage curve shape | distance of the curve from a golden curve | Process deviation | Align by weld phase |   |   |   |
| Electrode wear count | welds since last tip dress | Quality decay | From the controller |   |   |   |
| Material stack and coating | sheet thickness and coating class | Changes the right parameters | From the order |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Destructive and X-ray test results linked to the weld | Visual operator judgement | Appearance does not always match strength |
| Signals | Image features together with current and voltage curves | Images alone | Many weak welds look fine on the surface |
| Sampling | Test samples across tools and shifts | Samples from convenient parts | Convenience hides drift |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Welder name | not a quality driver |
| Image resolution tweaks | an acquisition choice |
| Time of day alone | confounded with shift |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Bead geometry score inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: camera calibration needed. |
| Current and voltage curve shape inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: align by weld phase. |
| Electrode wear count inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the controller. |
| Material stack and coating inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the order. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: weld_seam_inspection_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: bead_geometry_score, type: double, nullable: false }
    - { name: current_and_voltage_curve_shape, type: double, nullable: false }
    - { name: electrode_wear_count, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Bead geometry score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Current and voltage curve shape against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Bead geometry score, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE weld_seam_inspection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE weld_seam_inspection_detections (
  frame_id TEXT NOT NULL REFERENCES weld_seam_inspection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE weld_seam_inspection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Weld Seam Inspection": Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Bead geometry score | Width, height and continuity from the image. Visible defects. | Leakage risk to design against: Camera calibration needed. |
| A signal-versus-noise trap in this use case: Label | The true signal is destructive and X-ray test results linked to the weld; the common noise is visual operator judgement. | Appearance does not always match strength. |

**Ask the experts**

- [ ] What exactly does "Weld judged within 5 s of completion" mean in practice for weld seam inspection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Bead geometry score" and "Current and voltage curve shape", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Rework per thousand welds" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using visual judgement as strength labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Electrode wear" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| AOI | Automated optical inspection of parts or boards. |
| Golden sample | A reference part known to be good. |
| Rework | Fixing a defective part so it can be sold. |
| First pass yield | The share of units that pass without rework. |
| SPC | Statistical process control: using control charts to detect process drift. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| Setpoint | The target value of a process variable. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| PLC | Programmable logic controller: a rugged computer that controls machines. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| Remaining useful life | The estimated time before a machine or component fails. |
| Changepoint | A moment when the behaviour of a series changes, such as a level shift. |
| Level shift | An abrupt, lasting change in a series' average. |
| Lag feature | A past value of the series used as a predictor. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
