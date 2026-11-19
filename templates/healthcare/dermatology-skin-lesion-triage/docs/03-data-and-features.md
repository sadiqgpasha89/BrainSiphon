# Dermatology Skin Lesion Triage: data and feature specification

> Generated from the blueprint `healthcare/dermatology-skin-lesion-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dermatology Skin Lesion Triage · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Dermatology Skin Lesion Triage": Triage skin lesion photos from primary care and consumers to urgent, routine or reassure, with strong performance across skin tones. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Public datasets with artefacts.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lesion segmentation features | border irregularity, colour variegation | ABCDE logic | Segmentation quality |   |   |   |
| Dermoscopy vs clinical photo flag | modality | Different distributions | Metadata |   |   |   |
| Prior lesion comparison | change over time | Evolution | Same-lesion linking |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fairness | Group-wise performance reported across skin tones | Average accuracy | Datasets are skewed toward light skin |
| Capture | Capture guidance and quality gating | Any user photo | Blur and lighting dominate errors |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Skin-marker pen ink | shortcut |
| Image ruler presence | dataset artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lesion segmentation features inputs | Clinical informatics | Electronic health record (EHR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: segmentation quality. |
| Dermoscopy vs clinical photo flag inputs | Hospital data office | Laboratory, radiology and PACS systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: metadata. |
| Prior lesion comparison inputs | Integration team | Master patient index (MPI) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: same-lesion linking. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: dermatology_skin_lesion_triage_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lesion_segmentation_features, type: double, nullable: false }
    - { name: dermoscopy_vs_clinical_photo_flag, type: double, nullable: false }
    - { name: prior_lesion_comparison, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Lesion segmentation features and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Dermoscopy vs clinical photo flag against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lesion segmentation features, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| ISIC Archive (skin lesion images) | https://challenge.isic-archive.com/ | Licences per collection (see the site) | Dermoscopic images with diagnoses from the International Skin Imaging Collaboration | Site and device differences; skin-tone coverage is uneven. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MedMNIST | https://medmnist.com/ | CC BY 4.0 per dataset (see the site) | Standardised small medical image datasets for classification and segmentation across modalities | Low resolution; for prototyping, not clinical performance claims. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE dermatology_skin_lesion_triage_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE dermatology_skin_lesion_triage_detections (
  frame_id TEXT NOT NULL REFERENCES dermatology_skin_lesion_triage_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE dermatology_skin_lesion_triage_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Dermatology Skin Lesion Triage": Triage skin lesion photos from primary care and consumers to urgent, routine or reassure, with strong performance across skin tones. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Medical imaging and diagnostics | Models read radiographs, scans, slides, retinal and skin images. Labels come from radiologist reports, adjudicated reads or biopsy; devices, hospitals and populations differ, and a model's apparent accuracy can come from artefacts such as scanner markings rather than disease. | Evaluation must hold out whole sites or devices and report sensitivity at clinically agreed specificity, with subgroup performance. |
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Lesion segmentation features | Border irregularity, colour variegation. ABCDE logic. | Leakage risk to design against: Segmentation quality. |
| A signal-versus-noise trap in this use case: Fairness | The true signal is group-wise performance reported across skin tones; the common noise is average accuracy. | Datasets are skewed toward light skin. |

**Ask the experts**

- [ ] What exactly does "Skin-tone fairness (Fitzpatrick I-VI)" mean in practice for dermatology skin lesion triage: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lesion segmentation features" and "Dermoscopy vs clinical photo flag", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to specialist for urgent lesions" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: public datasets with artefacts, and who can confirm the cut-off times and splits?
- [ ] How often does "Dark skin tones underrepresented" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Dermatology / dermoscopy | Skin medicine and the imaging of skin lesions with a dermatoscope. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Sensitivity at fixed specificity | The share of true findings caught when false alarms are held to an agreed level. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Transfer learning | Starting from a model pretrained on a large image set and adapting it to a small task dataset. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
