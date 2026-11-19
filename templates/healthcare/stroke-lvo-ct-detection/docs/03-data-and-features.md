# Stroke Large-Vessel Occlusion CT Detection: data and feature specification

> Generated from the blueprint `healthcare/stroke-lvo-ct-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Stroke Large-Vessel Occlusion CT Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Stroke Large-Vessel Occlusion CT Detection": Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Retrospective cohorts with selected cases.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Vessel density asymmetry | hyperdense vessel features | LVO cue | Registration quality |   |   |   |
| Collateral score | vessel filling in CTA phases | Prognosis | Phase timing |   |   |   |
| Clot burden estimate | occlusion extent | Triage | Annotation |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Time | End-to-end alert latency as primary metric | Offline accuracy | Minutes matter more than marginal AUC |
| Workflow | Parallel notification to specialists | Replacing radiologist | Value comes from faster mobilisation |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Patient position | variable |
| Scanner site | domain |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Vessel density asymmetry inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: registration quality. |
| Collateral score inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: phase timing. |
| Clot burden estimate inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: annotation. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: stroke_lvo_ct_detection_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: vessel_density_asymmetry, type: double, nullable: false }
    - { name: collateral_score, type: double, nullable: false }
    - { name: clot_burden_estimate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Vessel density asymmetry and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Collateral score against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Vessel density asymmetry, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ISIC Archive (skin lesion images) | https://challenge.isic-archive.com/ | Licences per collection (see the site) | Dermoscopic images with diagnoses from the International Skin Imaging Collaboration | Site and device differences; skin-tone coverage is uneven. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE stroke_lvo_ct_detection_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE stroke_lvo_ct_detection_detections (
  frame_id TEXT NOT NULL REFERENCES stroke_lvo_ct_detection_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE stroke_lvo_ct_detection_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Stroke Large-Vessel Occlusion CT Detection": Detect large vessel occlusions on CT angiography within minutes and notify stroke teams in parallel to speed thrombectomy. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Vessel density asymmetry | Hyperdense vessel features. LVO cue. | Leakage risk to design against: Registration quality. |
| A signal-versus-noise trap in this use case: Time | The true signal is end-to-end alert latency as primary metric; the common noise is offline accuracy. | Minutes matter more than marginal AUC. |

**Ask the experts**

- [ ] What exactly does "Door-to-notification under 5 minutes" mean in practice for stroke large-vessel occlusion ct detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Vessel density asymmetry" and "Collateral score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Door-to-puncture time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: retrospective cohorts with selected cases, and who can confirm the cut-off times and splits?
- [ ] How often does "Motion artefacts" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| DICOM | The standard file format for medical images, with metadata that can contain patient identifiers. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Single-cell RNA sequencing | A technique that measures gene activity in individual cells, used to identify cell types. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Sensitivity at fixed specificity | The share of true findings caught when false alarms are held to an agreed level. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
