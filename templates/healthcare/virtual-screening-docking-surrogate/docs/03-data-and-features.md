# Virtual Screening with Docking Surrogates: data and feature specification

> Generated from the blueprint `healthcare/virtual-screening-docking-surrogate` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Virtual Screening with Docking Surrogates · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Virtual Screening with Docking Surrogates": Screen billion-molecule libraries by training fast surrogate models on docking scores, then dock only the top fraction. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training and test molecules share scaffolds.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Surrogate rank score | model predicted docking rank | Prioritisation | Calibrate on top tail |   |   |   |
| Pocket descriptors | binding-site features | Target conditioning | Structure version |   |   |   |
| Library diversity coverage | cluster coverage among selected | Avoid redundancy | Clustering |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Metric | Enrichment factor at the top fraction | Global RMSE of docking scores | Only the top tail matters for screening |
| Ground truth | Experimental confirmation of top picks | Docking as truth | Docking scores correlate weakly with binding |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Molecular weight alone | confounds docking scores |
| Compound supplier | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Surrogate rank score inputs | Clinical informatics | Electronic health record (EHR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibrate on top tail. |
| Pocket descriptors inputs | Hospital data office | Laboratory, radiology and PACS systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: structure version. |
| Library diversity coverage inputs | Integration team | Master patient index (MPI) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: clustering. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: virtual_screening_docking_surrogate_inputs.v1
owner: clinical-informatics@example.com
system_of_record: Electronic health record (EHR)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: surrogate_rank_score, type: double, nullable: false }
    - { name: pocket_descriptors, type: double, nullable: false }
    - { name: library_diversity_coverage, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Surrogate rank score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Pocket descriptors against Electronic health record (EHR)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Surrogate rank score, traces back to Electronic health record (EHR); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Heart Disease | https://archive.ics.uci.edu/dataset/45/heart+disease | CC BY 4.0 (see the UCI page) | Small clinical dataset with a heart-disease label | Tiny; use only to test pipeline and calibration code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MoleculeNet | https://deepchem.readthedocs.io/en/latest/api_reference/moleculenet.html | MIT licence (see the site) | A benchmark collection of molecular property datasets (toxicity, solubility, binding) | Benchmark splits can be optimistic; use scaffold splits. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIMIC-IV | https://physionet.org/content/mimiciv/3.1/ | PhysioNet Credentialed Health Data License; credentialing required | De-identified hospital and ICU stays with vitals, labs, medications and procedures | Credentialed access; single centre. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE virtual_screening_docking_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE virtual_screening_docking_detections (
  frame_id TEXT NOT NULL REFERENCES virtual_screening_docking_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE virtual_screening_docking_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Virtual Screening with Docking Surrogates": Screen billion-molecule libraries by training fast surrogate models on docking scores, then dock only the top fraction. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Drug discovery and genomics | Early discovery predicts molecular properties, binding and toxicity; genomics predicts the effect of variants and risk from many small genetic effects. Data are small, assays noisy, and the cost of a wrong prediction is a failed experiment, so uncertainty estimates matter. | Random splits are overly optimistic; scaffold or lineage splits show how a model generalises to new chemistry or populations. |
| Medical imaging and diagnostics | Models read radiographs, scans, slides, retinal and skin images. Labels come from radiologist reports, adjudicated reads or biopsy; devices, hospitals and populations differ, and a model's apparent accuracy can come from artefacts such as scanner markings rather than disease. | Evaluation must hold out whole sites or devices and report sensitivity at clinically agreed specificity, with subgroup performance. |
| Entity resolution and transitivity | Resolving duplicates means deciding which records refer to the same real-world entity. Because 'same as' is transitive, one wrong link can merge two large groups, so precision on links matters more than recall and clusters are monitored for abnormal size. | Weight shared attributes by their rarity and cap hubs before clustering. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Surrogate rank score | Model predicted docking rank. Prioritisation. | Leakage risk to design against: Calibrate on top tail. |
| A signal-versus-noise trap in this use case: Metric | The true signal is enrichment factor at the top fraction; the common noise is global RMSE of docking scores. | Only the top tail matters for screening. |

**Ask the experts**

- [ ] What exactly does "Compute budget" mean in practice for virtual screening with docking surrogates: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Surrogate rank score" and "Pocket descriptors", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Compounds docked per hit" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training and test molecules share scaffolds, and who can confirm the cut-off times and splits?
- [ ] How often does "Receptor conformation changes" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Docking | Simulating how a molecule fits into a protein's binding site to estimate binding strength. |
| Sensitivity / specificity | The share of true cases caught and the share of healthy cases correctly cleared. |
| Prevalence | How common a condition is in the population, which determines how useful a positive result is. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Ordinal triage scale | A graded urgency scale in which being wrong by two levels is worse than by one. |
| ADMET | Absorption, distribution, metabolism, excretion and toxicity: properties that decide whether a molecule can be a drug. |
| Mental health crisis | A situation, such as suicidal intent, that needs immediate human escalation rather than automated advice. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Community detection | Finding groups of nodes more densely connected to each other than to the rest. |
| Node embedding | A vector that represents a node's position and neighbourhood in the graph. |
| GNN | Graph neural network: a model that updates each node from its neighbours' features. |
| Sensitivity at fixed specificity | The share of true findings caught when false alarms are held to an agreed level. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Multiple-instance learning | Learning from a bag of patches with only a bag-level label, as in whole-slide pathology. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
