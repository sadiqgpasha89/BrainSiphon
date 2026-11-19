# Diabetic Retinopathy Screening: data and feature specification

> Generated from the blueprint `healthcare/diabetic-retinopathy-screening` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Diabetic Retinopathy Screening · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Diabetic Retinopathy Screening": Screen fundus photographs for referable diabetic retinopathy in primary care, with a safe referral path for ungradable images. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Validation on tertiary-hospital images only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lesion-level evidence | microaneurysm and haemorrhage detection maps | Explains grades | Annotate with expert segmentation |   |   |   |
| Image quality score | focus, illumination and field coverage | Gate | Calibrated on device types |   |   |   |
| Ordinal grade probability | distribution over disease grades | Referral decision | Calibrate thresholds by population |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Gradeability | Image-quality gate with recapture guidance | Forcing a grade on every image | Poor images produce confident wrong grades |
| Labels | Adjudicated consensus of multiple graders | Single-grader labels | Inter-grader disagreement is high for mild disease |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Image brightness | device effect |
| Patient ID | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lesion-level evidence inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: annotate with expert segmentation. |
| Image quality score inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibrated on device types. |
| Ordinal grade probability inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibrate thresholds by population. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: diabetic_retinopathy_screening_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lesion_level_evidence, type: double, nullable: false }
    - { name: image_quality_score, type: double, nullable: false }
    - { name: ordinal_grade_probability, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Lesion-level evidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Image quality score against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lesion-level evidence, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Diabetic Retinopathy Detection | https://www.kaggle.com/c/diabetic-retinopathy-detection | Competition rules; free Kaggle login | Retinal images graded for diabetic retinopathy severity | Variable image quality and grader noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE diabetic_retinopathy_screening_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE diabetic_retinopathy_screening_detections (
  frame_id TEXT NOT NULL REFERENCES diabetic_retinopathy_screening_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE diabetic_retinopathy_screening_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Diabetic Retinopathy Screening": Screen fundus photographs for referable diabetic retinopathy in primary care, with a safe referral path for ungradable images. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Medical imaging and diagnostics | Models read radiographs, scans, slides, retinal and skin images. Labels come from radiologist reports, adjudicated reads or biopsy; devices, hospitals and populations differ, and a model's apparent accuracy can come from artefacts such as scanner markings rather than disease. | Evaluation must hold out whole sites or devices and report sensitivity at clinically agreed specificity, with subgroup performance. |
| Population health, risk and fairness | Health systems stratify patients by risk to allocate care management, and predict readmissions, cost and chronic disease progression. Cost is not need: a model that predicts spending can underserve groups who historically had less access to care. | Choose targets that measure health need, and audit performance across demographic groups. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Lesion-level evidence | Microaneurysm and haemorrhage detection maps. Explains grades. | Leakage risk to design against: Annotate with expert segmentation. |
| A signal-versus-noise trap in this use case: Gradeability | The true signal is image-quality gate with recapture guidance; the common noise is forcing a grade on every image. | Poor images produce confident wrong grades. |

**Ask the experts**

- [ ] What exactly does "Sensitivity above 90% and specificity above 85%" mean in practice for diabetic retinopathy screening: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lesion-level evidence" and "Image quality score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Screening completion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: validation on tertiary-hospital images only, and who can confirm the cut-off times and splits?
- [ ] How often does "Dilated vs undilated pupils" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| Prevalence | How common a condition is in the population, which determines how useful a positive result is. |
| Docking | Simulating how a molecule fits into a protein's binding site to estimate binding strength. |
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| HCC | Hierarchical condition category: a risk-adjustment grouping of diagnoses that determines payments. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Readmission | A return to hospital shortly after discharge, usually counted within 30 days and tied to quality penalties. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Dermatology / dermoscopy | Skin medicine and the imaging of skin lesions with a dermatoscope. |
| Sensitivity at fixed specificity | The share of true findings caught when false alarms are held to an agreed level. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Distribution shift | A change in the data a model sees compared with training. |
