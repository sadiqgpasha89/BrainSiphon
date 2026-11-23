# Drone Inspection Analysis: data and feature specification

> Generated from the blueprint `engineering/drone-inspection-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Drone Inspection Analysis · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Drone Inspection Analysis": Analyse drone images of roofs, towers, stockpiles and facades to detect damage and measure change over time, for inspectors to confirm and plan repairs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model findings as labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Defect candidates | cracks, corrosion and loose items | Core | From a vision model |   |   |   |
| Pose and registration | position of images over time | Alignment | From survey data |   |   |   |
| Measurement scale | resolution and scale | Size | From metadata |   |   |   |
| Asset history | earlier findings | Context | From records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Inspector-verified defects | Model findings from earlier runs | Errors can be copied forward |
| Compare | Same-angle repeat captures | Different angles | Angle changes look like change |
| Privacy | Flight plans avoiding private areas | Unrestricted capture | Drones capture people and neighbours |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Pilot name | personal data |
| Drone model | weak link |
| Weather label | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Defect candidates inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from a vision model. |
| Pose and registration inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from survey data. |
| Measurement scale inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from metadata. |
| Asset history inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: drone_inspection_analysis_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: defect_candidates, type: double, nullable: false }
    - { name: pose_and_registration, type: double, nullable: false }
    - { name: measurement_scale, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Defect candidates and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Pose and registration against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Defect candidates, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE drone_inspection_analysis_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE drone_inspection_analysis_detections (
  frame_id TEXT NOT NULL REFERENCES drone_inspection_analysis_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE drone_inspection_analysis_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Drone Inspection Analysis": Analyse drone images of roofs, towers, stockpiles and facades to detect damage and measure change over time, for inspectors to confirm and plan repairs. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Inspection finds defects before they are built in | Welds, concrete and structures are checked by qualified inspectors with measurements and images. Models can prioritise and highlight, but acceptance remains a human, certified decision. | A missed severe defect costs far more than a recheck, so recall matters. |
| Site safety is about conditions | Hazards such as open edges, exclusion zones and plant movement can be detected at scene level. Monitoring individual workers raises legal and trust issues. | Safety tools support inspections and do not replace them. |
| Contracts allocate risk | Contract terms decide who pays for delay, change and defects, and disputes depend on records kept at the time. Contemporaneous, linked records are the evidence. | Missing records weaken a claim long after the work is done. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Defect candidates | Cracks, corrosion and loose items. Core. | Leakage risk to design against: From a vision model. |
| A signal-versus-noise trap in this use case: Label | The true signal is inspector-verified defects; the common noise is model findings from earlier runs. | Errors can be copied forward. |

**Ask the experts**

- [ ] What exactly does "Findings link to image and location" mean in practice for drone inspection analysis: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Defect candidates" and "Pose and registration", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to inspect" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: model findings as labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Glare" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Change order | A formal change to scope, cost or time. |
| As-built | The record of what was actually built. |
| Point cloud | A set of 3D points from a laser scan. |
| Finite element analysis | A numerical method for stress and heat analysis. |
| NDT | Non-destructive testing of materials and welds. |
| Delay analysis | Methods to find the causes and effects of delay. |
| Health and safety plan | A plan for managing risk on a project. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
