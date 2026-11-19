# Catastrophe Loss Estimation from Imagery: data and feature specification

> Generated from the blueprint `bfsi/catastrophe-loss-estimation-from-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Catastrophe Loss Estimation from Imagery · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Catastrophe Loss Estimation from Imagery": Estimate insured damage within days of a catastrophe from aerial and satellite imagery combined with the policy book, so reserves and claims staffing are set early. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on one event type.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Footprint damage grade | classifier over pre and post imagery per footprint | Core input | Cloud and angle effects |   |   |   |
| Hazard intensity | wind speed or flood depth at the location | Physical driver | Hazard maps are modelled |   |   |   |
| Construction class | roof and wall type from the policy | Vulnerability | Data quality |   |   |   |
| Sum insured and deductible | policy terms | Converts damage to loss | Terms change at renewal |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Damage | Damage grade per building footprint | Pixel-level change on the whole scene | Debris and flooding change pixels without damaging insured structures |
| Exposure | Join damage to insured values and deductibles | Damage counts alone | Loss depends on sums insured and policy terms |
| Validation | Calibrate against early claims and surveys | Trusting model output | Imagery cannot see interior or water damage |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Scene brightness | sensor effect |
| Image tile boundary | artefact |
| Satellite name | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Footprint damage grade inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cloud and angle effects. |
| Hazard intensity inputs | Risk data office | General ledger and risk data warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: hazard maps are modelled. |
| Construction class inputs | Operations | Customer master and KYC repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data quality. |
| Sum insured and deductible inputs | Core banking IT | Core banking or policy administration system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: terms change at renewal. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: catastrophe_loss_estimation_from_imagery_inputs.v1
owner: core-banking-it@example.com
system_of_record: Core banking or policy administration system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: footprint_damage_grade, type: double, nullable: false }
    - { name: hazard_intensity, type: double, nullable: false }
    - { name: construction_class, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Footprint damage grade and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Hazard intensity against Core banking or policy administration system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Footprint damage grade, traces back to Core banking or policy administration system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE catastrophe_loss_estimation_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE catastrophe_loss_estimation_detections (
  frame_id TEXT NOT NULL REFERENCES catastrophe_loss_estimation_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE catastrophe_loss_estimation_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

BFSI is the part of finance that is run as a regulated institution: banks lending against collateral, treasuries funding the balance sheet, custodians and brokers settling trades, wealth managers advising clients and insurers pricing and paying claims. Unlike payments, most decisions here are slow, documented and reviewed by someone who can be held accountable, so the model is usually one input to a credit officer, underwriter, operations analyst or validator. What you may use, how you explain it and who signs off are set by regulation and internal model risk policy, and they shape the design as much as accuracy does. For this use case, "Catastrophe Loss Estimation from Imagery": Estimate insured damage within days of a catastrophe from aerial and satellite imagery combined with the policy book, so reserves and claims staffing are set early. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Insurance: pricing, underwriting, claims and reserving | An insurer collects premiums, underwrites risks, pays claims and holds reserves for claims not yet settled. Underwriting selects and prices risk, claims handling pays and investigates, and actuaries estimate ultimate cost from development triangles using methods such as chain-ladder. | Labels arrive years later for long-tail lines, and the same data feed serves pricing, claims and reserving teams with different definitions. |
| Model risk management and validation | Banks treat models as a source of risk: each is inventoried, tiered, independently validated, monitored and periodically re-approved. Validators check conceptual soundness, data, implementation and performance, and findings must be evidenced and tracked to closure. | A model that cannot be validated or explained to the validator does not go live, whatever its accuracy; this also applies to AI assistants used in the validation process. |
| Regulatory change and reporting | Rules change constantly across prudential, conduct and financial crime regimes. Firms track consultations, map obligations to policies and controls, report to supervisors on fixed schedules and keep evidence of compliance. | Language-model tools that summarise regulation must cite the paragraph and the version in force, because a confident summary of superseded text is worse than none. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Footprint damage grade | Classifier over pre and post imagery per footprint. Core input. | Leakage risk to design against: Cloud and angle effects. |
| A signal-versus-noise trap in this use case: Damage | The true signal is damage grade per building footprint; the common noise is pixel-level change on the whole scene. | Debris and flooding change pixels without damaging insured structures. |

**Ask the experts**

- [ ] What exactly does "Estimates within 72 hours of imagery" mean in practice for catastrophe loss estimation from imagery: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Footprint damage grade" and "Hazard intensity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Early estimate error" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on one event type, and who can confirm the cut-off times and splits?
- [ ] How often does "Cloud cover" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Catastrophe model | A simulation of hazard, exposure and vulnerability that estimates insured losses from events such as storms or earthquakes. |
| Chain-ladder | An actuarial method that projects ultimate claims from the development of past claims in a triangle. |
| Loss triangle | A table of claims by accident period and development period, used to estimate unpaid claims. |
| IBNR | Incurred but not reported: claims that have happened but have not yet been reported or fully known. |
| Reinsurance | Insurance bought by an insurer to transfer part of its risk to another company. |
| Model tier | A classification of a model by its materiality, which sets how deeply it is validated. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
