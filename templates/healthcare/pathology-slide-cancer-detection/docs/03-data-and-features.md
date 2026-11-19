# Whole-Slide Pathology Cancer Detection: data and feature specification

> Generated from the blueprint `healthcare/pathology-slide-cancer-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Whole-Slide Pathology Cancer Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Whole-Slide Pathology Cancer Detection": Assist pathologists by detecting and localising tumour regions in gigapixel whole-slide images to prioritise and speed up diagnosis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on a single institution.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Tile attention scores | attention-weighted tile importance | Localises tumour | Check heatmap fidelity against annotations |   |   |   |
| Foundation-model tile embeddings | pretrained pathology encoder features | Strong representation | Frozen vs finetuned tradeoff |   |   |   |
| Slide-level uncertainty | ensemble variance | Triage low confidence | Calibrate |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Supervision | Multiple-instance learning with attention on tiles | Tile-level labels from heuristic masks | Heuristic masks encode annotator bias |
| Stain | Stain normalisation and augmentation across scanners | One lab's staining | Stain shifts reduce performance 10-20 points |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Slide background area | irrelevant |
| Scanner serial | artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Tile attention scores inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: check heatmap fidelity against annotations. |
| Foundation-model tile embeddings inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: frozen vs finetuned tradeoff. |
| Slide-level uncertainty inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibrate. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: pathology_slide_cancer_detection_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: tile_attention_scores, type: double, nullable: false }
    - { name: foundation_model_tile_embeddings, type: double, nullable: false }
    - { name: slide_level_uncertainty, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Tile attention scores and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Foundation-model tile embeddings against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Tile attention scores, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MedMNIST | https://medmnist.com/ | CC BY 4.0 per dataset (see the site) | Standardised small medical image datasets for classification and segmentation across modalities | Low resolution; for prototyping, not clinical performance claims. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE pathology_slide_cancer_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE pathology_slide_cancer_detections (
  frame_id TEXT NOT NULL REFERENCES pathology_slide_cancer_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE pathology_slide_cancer_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Whole-Slide Pathology Cancer Detection": Assist pathologists by detecting and localising tumour regions in gigapixel whole-slide images to prioritise and speed up diagnosis. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Medical imaging and diagnostics | Models read radiographs, scans, slides, retinal and skin images. Labels come from radiologist reports, adjudicated reads or biopsy; devices, hospitals and populations differ, and a model's apparent accuracy can come from artefacts such as scanner markings rather than disease. | Evaluation must hold out whole sites or devices and report sensitivity at clinically agreed specificity, with subgroup performance. |
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Tile attention scores | Attention-weighted tile importance. Localises tumour. | Leakage risk to design against: Check heatmap fidelity against annotations. |
| A signal-versus-noise trap in this use case: Supervision | The true signal is multiple-instance learning with attention on tiles; the common noise is tile-level labels from heuristic masks. | Heuristic masks encode annotator bias. |

**Ask the experts**

- [ ] What exactly does "100,000x100,000 pixel slides" mean in practice for whole-slide pathology cancer detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Tile attention scores" and "Foundation-model tile embeddings", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to diagnosis" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on a single institution, and who can confirm the cut-off times and splits?
- [ ] How often does "Scanner firmware update changes colour profile" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Whole-slide image | A gigapixel scan of a pathology slide, analysed in small tiles. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Segmentation | Outlining the exact pixels of an organ, tumour or structure in an image. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| Single-cell RNA sequencing | A technique that measures gene activity in individual cells, used to identify cell types. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Multiple-instance learning | Learning from a bag of patches with only a bag-level label, as in whole-slide pathology. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
