# Progress Monitoring from Drone Imagery: data and feature specification

> Generated from the blueprint `real-estate/progress-monitoring-from-drone-imagery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Progress Monitoring from Drone Imagery · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Progress Monitoring from Drone Imagery": Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on one site hides failures on sites with different structures and materials.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Point cloud registration | root-mean-square error of aligned points to BIM control points | Measures whether comparisons are meaningful | Drift over a large site needs control markers |   |   |   |
| Element completion | classifier probability that an element is built, per element | The base of progress reporting | Occlusion hides elements, so report visibility alongside |   |   |   |
| Deviation | millimetres between the as-built surface and the BIM surface per element | Quality control against the design | Noise in the point cloud limits precision, so state the error margin |   |   |   |
| Schedule variance | planned finish minus predicted finish by task, in days | Links progress to schedule | Depends on a current plan |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Alignment | Captured data registered to the BIM model coordinates | Raw images compared as they are | Misalignment produces apparent deviation that is not real |
| Element | Status per building element such as slab, column and facade panel | A single percentage complete | One number hides which elements are done and which are not, so payment and sequencing decisions suffer |
| Tolerance | Deviation checked against the tolerance for each element type | A visual impression of quality | Out-of-tolerance work becomes rework that is costly to find later |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Lighting | Varies by time of day and does not change the structure |
| Weather | Affects image quality and must be normalised and not read as progress |
| Cloud | Cloud cover is a capture condition and has no information on the building |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Point cloud registration inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: drift over a large site needs control markers. |
| Element completion inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: occlusion hides elements, so report visibility alongside. |
| Deviation inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: noise in the point cloud limits precision, so state the error margin. |
| Schedule variance inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: depends on a current plan. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: progress_monitoring_from_drone_imagery_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: point_cloud_registration, type: double, nullable: false }
    - { name: element_completion, type: double, nullable: false }
    - { name: deviation, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Point cloud registration and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Element completion against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Point cloud registration, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MedMNIST | https://medmnist.com/ | CC BY 4.0 per dataset (see the site) | Standardised small medical image datasets for classification and segmentation across modalities | Low resolution; for prototyping, not clinical performance claims. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE progress_monitoring_from_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE progress_monitoring_from_detections (
  frame_id TEXT NOT NULL REFERENCES progress_monitoring_from_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE progress_monitoring_from_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Progress Monitoring from Drone Imagery": Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| Climate, flood and property risk | Properties face flood, wildfire, heat and wind risk that depends on elevation, drainage, vegetation and building construction, and on the climate scenario chosen. Lenders and insurers price and limit exposure, and buyers increasingly ask for property-level scores. | Scores must state the scenario, the date of the hazard data and the uncertainty, because they affect prices and insurability. |
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Point cloud registration | Root-mean-square error of aligned points to BIM control points. Measures whether comparisons are meaningful. | Leakage risk to design against: Drift over a large site needs control markers. |
| A signal-versus-noise trap in this use case: Alignment | The true signal is captured data registered to the BIM model coordinates; the common noise is raw images compared as they are. | Misalignment produces apparent deviation that is not real. |

**Ask the experts**

- [ ] What exactly does "Drone capture weekly at the agreed flight times" mean in practice for progress monitoring from drone imagery: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Point cloud registration" and "Element completion", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Report time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on one site hides failures on sites with different structures and materials, and who can confirm the cut-off times and splits?
- [ ] How often does "Occlusion" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| BIM | Building information model: a digital 3D model of a building with data on every element. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Days on market | The number of days a listing takes to go under contract. |
| Earned value | A project-control method that compares work completed with the plan and the cost spent. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Bill of quantities | A list of materials and work items with quantities, used for tender and cost control. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Multiple-instance learning | Learning from a bag of patches with only a bag-level label, as in whole-slide pathology. |
| Distribution shift | A change in the data a model sees compared with training. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
