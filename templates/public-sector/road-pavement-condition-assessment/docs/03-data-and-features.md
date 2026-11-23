# Road Pavement Condition Assessment: data and feature specification

> Generated from the blueprint `public-sector/road-pavement-condition-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Road Pavement Condition Assessment · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Road Pavement Condition Assessment": Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Raw image storage.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Crack and pothole detection | model score per defect | Condition | Calibrated |   |   |   |
| Traffic volume and road class | vehicles and class | Priority | From the register |   |   |   |
| Surface age and last treatment | years since treatment | Deterioration | From the asset system |   |   |   |
| Weather exposure | freeze and thaw cycles | Deterioration | From weather |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Truth | Engineer-rated condition scores | Image tags | Tags vary in quality |
| Priority | Condition, traffic and treatment cost | Damage count | A small defect on a main road can matter more |
| Privacy | Blurred people and plates | Raw video storage | Street imagery shows people |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Vehicle name | irrelevant |
| Survey vendor | irrelevant |
| File name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Crack and pothole detection inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibrated. |
| Traffic volume and road class inputs | Programme and policy owners | Tax, benefits and licensing systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the register. |
| Surface age and last treatment inputs | City operations | GIS and asset management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the asset system. |
| Weather exposure inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from weather. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: road_pavement_condition_assessment_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: crack_and_pothole_detection, type: double, nullable: false }
    - { name: traffic_volume_and_road_class, type: double, nullable: false }
    - { name: surface_age_and_last_treatment, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Crack and pothole detection and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Traffic volume and road class against Case management and CRM
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Crack and pothole detection, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE road_pavement_condition_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE road_pavement_condition_detections (
  frame_id TEXT NOT NULL REFERENCES road_pavement_condition_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE road_pavement_condition_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Road Pavement Condition Assessment": Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Cities run on shared infrastructure data | Traffic, transit, lighting, waste, water and buildings produce sensor and operational data owned by different departments. Value comes from joining them for operations and planning. | Without shared identifiers and governance, every project builds its own isolated pipeline. |
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Crack and pothole detection | Model score per defect. Condition. | Leakage risk to design against: Calibrated. |
| A signal-versus-noise trap in this use case: Truth | The true signal is engineer-rated condition scores; the common noise is image tags. | Tags vary in quality. |

**Ask the experts**

- [ ] What exactly does "Condition index per road segment with the image evidence" mean in practice for road pavement condition assessment: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Crack and pothole detection" and "Traffic volume and road class", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost per lane-kilometre treated" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: raw image storage, and who can confirm the cut-off times and splits?
- [ ] How often does "Wet road" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pothole | A road surface defect that needs repair. |
| Asset register | A list of infrastructure assets and their condition. |
| Congestion | Slow traffic caused by too much demand for road space. |
| Street lighting | Lights on public roads. |
| Eligibility | The rules that decide whether someone qualifies for a benefit or service. |
| Appeal | A formal challenge to a decision. |
| Case management | Systems for tracking cases through a process. |
| Overpayment | Money paid to someone beyond their entitlement. |
| Digital twin | A model of a city or asset kept current with real data. |
| Traffic signal | A signal that controls traffic flow at junctions. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| IoU | Intersection over union: the overlap between a predicted and a true region divided by their union. |
| Re-identification | Recognising the same person or object across different camera views. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| p99 latency | The time within which 99% of requests complete. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
