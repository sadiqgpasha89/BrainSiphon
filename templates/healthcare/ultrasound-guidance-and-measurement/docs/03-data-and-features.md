# Ultrasound Guidance & Auto-Measurement: data and feature specification

> Generated from the blueprint `healthcare/ultrasound-guidance-and-measurement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ultrasound Guidance & Auto-Measurement · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Ultrasound Guidance & Auto-Measurement": Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on expert-acquired scans only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| View-quality score | probability of a standard diagnostic view | Guidance | Calibrated |   |   |   |
| Anatomical landmark heatmaps | keypoint localisations | Measurement | Landmark annotation |   |   |   |
| Cardiac phase detection | end-diastole and systole frames | EF computation | Tracking |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Guidance | Closed-loop guidance to the target view | Post-hoc image analysis | Poor scans cannot be fixed after acquisition |
| Measurement | Uncertainty with measurements | Single-number outputs | Clinicians must know reliability |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Gain and depth settings | acquisition variables |
| Probe vendor | domain |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| View-quality score inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibrated. |
| Anatomical landmark heatmaps inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: landmark annotation. |
| Cardiac phase detection inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: tracking. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ultrasound_guidance_and_measurement_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: view_quality_score, type: double, nullable: false }
    - { name: anatomical_landmark_heatmaps, type: double, nullable: false }
    - { name: cardiac_phase_detection, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on View-quality score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Anatomical landmark heatmaps against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as View-quality score, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MedMNIST | https://medmnist.com/ | CC BY 4.0 per dataset (see the site) | Standardised small medical image datasets for classification and segmentation across modalities | Low resolution; for prototyping, not clinical performance claims. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE ultrasound_guidance_and_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE ultrasound_guidance_and_detections (
  frame_id TEXT NOT NULL REFERENCES ultrasound_guidance_and_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE ultrasound_guidance_and_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Ultrasound Guidance & Auto-Measurement": Provide real-time probe guidance and automatic measurements (fetal biometry, cardiac EF) so non-experts acquire diagnostic-quality scans. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Medical imaging and diagnostics | Models read radiographs, scans, slides, retinal and skin images. Labels come from radiologist reports, adjudicated reads or biopsy; devices, hospitals and populations differ, and a model's apparent accuracy can come from artefacts such as scanner markings rather than disease. | Evaluation must hold out whole sites or devices and report sensitivity at clinically agreed specificity, with subgroup performance. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Detection, segmentation and measurement | Classification says whether something is present; detection says where; segmentation outlines it pixel by pixel; measurement turns outlines into numbers such as lengths and volumes. Each has its own metrics and tolerances, and real-time use adds latency limits on edge hardware. | Choose the task and metric from the decision: a triage flag needs sensitivity, a surgical plan needs boundary accuracy. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: View-quality score | Probability of a standard diagnostic view. Guidance. | Leakage risk to design against: Calibrated. |
| A signal-versus-noise trap in this use case: Guidance | The true signal is closed-loop guidance to the target view; the common noise is post-hoc image analysis. | Poor scans cannot be fixed after acquisition. |

**Ask the experts**

- [ ] What exactly does "30 fps on handheld devices" mean in practice for ultrasound guidance & auto-measurement: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "View-quality score" and "Anatomical landmark heatmaps", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Scan success rate by novice operators" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on expert-acquired scans only, and who can confirm the cut-off times and splits?
- [ ] How often does "Patient body habitus reduces image quality" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Segmentation | Outlining the exact pixels of an organ, tumour or structure in an image. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| Prevalence | How common a condition is in the population, which determines how useful a positive result is. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Single-cell RNA sequencing | A technique that measures gene activity in individual cells, used to identify cell types. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
