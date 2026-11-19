# Construction Site Safety Monitoring: data and feature specification

> Generated from the blueprint `real-estate/construction-site-safety-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Construction Site Safety Monitoring · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Construction Site Safety Monitoring": Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Staged footage is clean and well lit and overstates accuracy on real, cluttered sites.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| PPE detection | probability that a detected person wears a helmet and a high-visibility vest | The most common safety rule | Occlusion by machinery lowers accuracy, so require confidence over frames |   |   |   |
| Zone entry | whether a person's position falls inside a polygon for an exclusion zone | A direct hazard definition | Camera calibration errors move the polygon, so recalibrate often |   |   |   |
| Equipment proximity | estimated distance between a person and moving plant | Struck-by incidents are a leading cause of harm | Depth from a single camera is imprecise |   |   |   |
| Event persistence | number of consecutive frames in which the hazard is seen | Removes single-frame false alarms | Longer persistence delays alerts, so balance with the 5 second limit |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Hazard | Specific hazards such as a person in an exclusion zone or no helmet | Detecting people on site | People are always present on a site, so presence is not a hazard |
| Privacy | Aggregate counts and blurred images | Identifying individuals | Identifying workers erodes trust and breaches privacy rules |
| Alert | A few precise alerts that supervisors act on | Many alerts for every possible issue | Alert fatigue leads supervisors to ignore the system, including when it is right |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Camera brand | A hardware attribute that has no effect on hazard |
| Worker identity | Personal and not allowed, and the model should not use it |
| Time stamp | Hazards occur at any time, so the clock adds no information |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| PPE detection inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: occlusion by machinery lowers accuracy, so require confidence over frames. |
| Zone entry inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: camera calibration errors move the polygon, so recalibrate often. |
| Equipment proximity inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: depth from a single camera is imprecise. |
| Event persistence inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: longer persistence delays alerts, so balance with the 5 second limit. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: construction_site_safety_monitoring_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ppe_detection, type: double, nullable: false }
    - { name: zone_entry, type: double, nullable: false }
    - { name: equipment_proximity, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on PPE detection and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Zone entry against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as PPE detection, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SKU-110K retail shelf detection | https://github.com/eg4000/SKU110K_CVPR19 | Academic and non-commercial use (see the repository) | About 11,700 shelf images with over a million densely packed product boxes | Academic-use licence. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| H&M Personalized Fashion Recommendations | https://www.kaggle.com/c/h-and-m-personalized-fashion-recommendations | Competition rules; free Kaggle login | Two years of purchases with article metadata and images for next-purchase recommendation | Large; fashion-specific seasonality. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RSNA Pneumonia Detection Challenge | https://www.kaggle.com/c/rsna-pneumonia-detection-challenge | Competition rules; free Kaggle login | Chest X-rays with bounding boxes for pneumonia opacities | Label noise and one source; check the terms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE construction_site_safety_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE construction_site_safety_detections (
  frame_id TEXT NOT NULL REFERENCES construction_site_safety_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE construction_site_safety_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Construction Site Safety Monitoring": Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: PPE detection | Probability that a detected person wears a helmet and a high-visibility vest. The most common safety rule. | Leakage risk to design against: Occlusion by machinery lowers accuracy, so require confidence over frames. |
| A signal-versus-noise trap in this use case: Hazard | The true signal is specific hazards such as a person in an exclusion zone or no helmet; the common noise is detecting people on site. | People are always present on a site, so presence is not a hazard. |

**Ask the experts**

- [ ] What exactly does "Alerts reach the supervisor within 5 seconds of a hazard" mean in practice for construction site safety monitoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "PPE detection" and "Zone entry", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Incidents" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: staged footage is clean and well lit and overstates accuracy on real, cluttered sites, and who can confirm the cut-off times and splits?
- [ ] How often does "Night" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Critical path | The longest chain of dependent tasks, which determines the project's earliest completion date. |
| Zoning | Local rules that limit how land can be used and built on, such as height, density and use. |
| Permit | Official approval to build, alter or occupy a structure. |
| CMMS | Computerised maintenance management system: software that tracks work orders and equipment maintenance. |
| BIM | Building information model: a digital 3D model of a building with data on every element. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Re-identification | Recognising the same person or object across different camera views. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
