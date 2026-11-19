# Radiotherapy Auto-Contouring: data and feature specification

> Generated from the blueprint `healthcare/radiotherapy-autocontouring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Radiotherapy Auto-Contouring · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Radiotherapy Auto-Contouring": Auto-segment organs at risk and target volumes on CT/MR to cut planning time from hours to minutes with clinician edits. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Contours from the same clinicians used to train.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Organ-at-risk segmentation masks | 3D U-Net masks | Plan inputs | Atlas protocol |   |   |   |
| Boundary uncertainty maps | ensemble variance at boundaries | Where to review | Calibrated |   |   |   |
| Anatomy variation flags | unusual anatomy detection | Safety | Rare cases |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Metric | Edit time and clinical acceptability | Dice alone | Dice misses clinically significant boundary errors |
| Variation | Institution-specific contouring guidelines | One universal style | Practices vary by centre |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Scanner brand | domain |
| Slice thickness | acquisition |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Organ-at-risk segmentation masks inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: atlas protocol. |
| Boundary uncertainty maps inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibrated. |
| Anatomy variation flags inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: rare cases. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: radiotherapy_autocontouring_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: organ_at_risk_segmentation_masks, type: double, nullable: false }
    - { name: boundary_uncertainty_maps, type: double, nullable: false }
    - { name: anatomy_variation_flags, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Organ-at-risk segmentation masks and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Boundary uncertainty maps against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Organ-at-risk segmentation masks, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MedMNIST | https://medmnist.com/ | CC BY 4.0 per dataset (see the site) | Standardised small medical image datasets for classification and segmentation across modalities | Low resolution; for prototyping, not clinical performance claims. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE radiotherapy_autocontouring_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE radiotherapy_autocontouring_detections (
  frame_id TEXT NOT NULL REFERENCES radiotherapy_autocontouring_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE radiotherapy_autocontouring_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Radiotherapy Auto-Contouring": Auto-segment organs at risk and target volumes on CT/MR to cut planning time from hours to minutes with clinician edits. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Medical imaging and diagnostics | Models read radiographs, scans, slides, retinal and skin images. Labels come from radiologist reports, adjudicated reads or biopsy; devices, hospitals and populations differ, and a model's apparent accuracy can come from artefacts such as scanner markings rather than disease. | Evaluation must hold out whole sites or devices and report sensitivity at clinically agreed specificity, with subgroup performance. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Organ-at-risk segmentation masks | 3D U-Net masks. Plan inputs. | Leakage risk to design against: Atlas protocol. |
| A signal-versus-noise trap in this use case: Metric | The true signal is edit time and clinical acceptability; the common noise is dice alone. | Dice misses clinically significant boundary errors. |

**Ask the experts**

- [ ] What exactly does "Clinical acceptability" mean in practice for radiotherapy auto-contouring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Organ-at-risk segmentation masks" and "Boundary uncertainty maps", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Planning time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: contours from the same clinicians used to train, and who can confirm the cut-off times and splits?
- [ ] How often does "Metal artefacts" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Segmentation | Outlining the exact pixels of an organ, tumour or structure in an image. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| DICOM | The standard file format for medical images, with metadata that can contain patient identifiers. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Remote patient monitoring | Tracking patients' vital signs at home and alerting clinicians to changes. |
| Adverse drug event | Harm caused by a medicine, including interactions between drugs. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Dice coefficient | An overlap score between two regions, widely used for segmentation. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
