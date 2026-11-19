# Construction Cost Estimation from Plans: data and feature specification

> Generated from the blueprint `real-estate/construction-cost-estimation-from-plans` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Construction Cost Estimation from Plans · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Construction Cost Estimation from Plans": Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: The final cost in the data includes changes, so it is not the cost of the plan as drawn.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Gross area and storeys | gross floor area and number of storeys read from the plans | The base driver of cost | Plans differ on what counts as gross, so define it |   |   |   |
| Spec level | classifier score from finish schedules and notes for low, medium, high and luxury | Finish drives cost per square metre | Specifications are text and often incomplete |   |   |   |
| Region index | construction cost index of the project region relative to a base | Adjusts for local labour and materials | Indices lag, so update them often |   |   |   |
| Similar project cost | cost per square metre of the five most similar past projects, escalated to today | A reference grounded in real outcomes | Matching is subjective, so show the projects used |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Quantities | Quantities taken off the plans by element, such as slab, walls and openings | Floor area alone | Two buildings of equal area differ widely in cost because of shape, structure and services |
| Escalation | Prices adjusted for time and region to the date of construction | Historic cost used as it was | Material and labour prices move, and a cost from three years ago is wrong now |
| Scope | Scope changes expected over the project | A static scope at estimate date | Change orders add cost, and an estimate that ignores them is always short |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Architect | Who drew the plan does not change the cost of building it |
| Drawing style | A cosmetic feature that varies by office and does not change quantities |
| Project name | A label with no cost information |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Gross area and storeys inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: plans differ on what counts as gross, so define it. |
| Spec level inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: specifications are text and often incomplete. |
| Region index inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: indices lag, so update them often. |
| Similar project cost inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: matching is subjective, so show the projects used. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: construction_cost_estimation_from_plans_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: gross_area_and_storeys, type: double, nullable: false }
    - { name: spec_level, type: double, nullable: false }
    - { name: region_index, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Gross area and storeys and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Spec level against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Gross area and storeys, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Inside Airbnb | https://insideairbnb.com/get-the-data/ | Creative Commons CC0 1.0 for most cities (check each city page) | Listing, calendar and review data for many cities, scraped from public Airbnb pages and refreshed regularly | Scraped, not official; calendar availability does not equal bookings and prices are asking prices. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Olist Brazilian E-Commerce | https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce | CC BY-NC-SA 4.0 (see the dataset page) | 100K orders with items, payments, reviews, delivery times and seller data | One marketplace and year; useful for delivery, review and seller analyses. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE construction_cost_estimation_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE construction_cost_estimation_detections (
  frame_id TEXT NOT NULL REFERENCES construction_cost_estimation_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE construction_cost_estimation_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Construction Cost Estimation from Plans": Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Construction: cost, schedule and site safety | A project moves from design to tender, build and handover, with cost estimates at each stage, a critical path of tasks and a site where safety is the first duty. Overruns come from scope changes, late materials, weather and productivity, and are seen in earned-value indicators. | Early estimates are ranges, not points, and anything that touches site workers needs privacy and union considerations. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Gross area and storeys | Gross floor area and number of storeys read from the plans. The base driver of cost. | Leakage risk to design against: Plans differ on what counts as gross, so define it. |
| A signal-versus-noise trap in this use case: Quantities | The true signal is quantities taken off the plans by element, such as slab, walls and openings; the common noise is floor area alone. | Two buildings of equal area differ widely in cost because of shape, structure and services. |

**Ask the experts**

- [ ] What exactly does "Every estimate is a range with a stated confidence and never a single number" mean in practice for construction cost estimation from plans: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Gross area and storeys" and "Spec level", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Estimate vs final cost" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: the final cost in the data includes changes, so it is not the cost of the plan as drawn, and who can confirm the cut-off times and splits?
- [ ] How often does "Early design" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Bill of quantities | A list of materials and work items with quantities, used for tender and cost control. |
| BIM | Building information model: a digital 3D model of a building with data on every element. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Critical path | The longest chain of dependent tasks, which determines the project's earliest completion date. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| OCR / text detection | Finding and reading text in images. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
