# Infrastructure Defect Detection: data and feature specification

> Generated from the blueprint `engineering/infrastructure-defect-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Infrastructure Defect Detection · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Infrastructure Defect Detection": Detect cracks, spalling, corrosion and leaks in images of bridges, tunnels and pipes and rank defects by severity for inspection engineers to confirm and schedule. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model labels as truth.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Defect class and extent | crack width and area | Core | From a vision model |   |   |   |
| Location on the structure | element and position | Context | From registration |   |   |   |
| Previous inspection findings | past condition | Progression | From records |   |   |   |
| Image quality | focus and lighting | Confidence | From the image |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Inspector ratings using the agency scale | Model labels from earlier runs | Errors would be copied |
| Cost | Missed severe defects cost most | Equal weights | The costs differ |
| Output | Located, measured defects | Image flags | Engineers need measurements |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Inspector name | personal data |
| Camera brand | weak link |
| File name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Defect class and extent inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from a vision model. |
| Location on the structure inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from registration. |
| Previous inspection findings inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from records. |
| Image quality inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the image. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: infrastructure_defect_detection_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: defect_class_and_extent, type: double, nullable: false }
    - { name: location_on_the_structure, type: double, nullable: false }
    - { name: previous_inspection_findings, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Defect class and extent and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Location on the structure against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Defect class and extent, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE infrastructure_defect_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE infrastructure_defect_detections (
  frame_id TEXT NOT NULL REFERENCES infrastructure_defect_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE infrastructure_defect_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Infrastructure Defect Detection": Detect cracks, spalling, corrosion and leaks in images of bridges, tunnels and pipes and rank defects by severity for inspection engineers to confirm and schedule. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Inspection finds defects before they are built in | Welds, concrete and structures are checked by qualified inspectors with measurements and images. Models can prioritise and highlight, but acceptance remains a human, certified decision. | A missed severe defect costs far more than a recheck, so recall matters. |
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Cost grows through change | Cost overruns come from scope change, design maturity, market prices and productivity. Early estimates carry wide uncertainty that narrows as design matures. | Reporting a single number at an early stage hides the range. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Defect class and extent | Crack width and area. Core. | Leakage risk to design against: From a vision model. |
| A signal-versus-noise trap in this use case: Label | The true signal is inspector ratings using the agency scale; the common noise is model labels from earlier runs. | Errors would be copied. |

**Ask the experts**

- [ ] What exactly does "Inspector confirms every defect before work orders" mean in practice for infrastructure defect detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Defect class and extent" and "Location on the structure", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Defects found before failure" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: model labels as truth, and who can confirm the cut-off times and splits?
- [ ] How often does "Dirt and stains" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Baseline schedule | The approved plan against which progress is measured. |
| Non-conformance | Work that does not meet requirements. |
| Change order | A formal change to scope, cost or time. |
| Earned value | A method that compares work done with plan and cost. |
| Finite element analysis | A numerical method for stress and heat analysis. |
| Claim | A request for extra time or money under a contract. |
| Engineer of record | The licensed engineer responsible for a design. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
