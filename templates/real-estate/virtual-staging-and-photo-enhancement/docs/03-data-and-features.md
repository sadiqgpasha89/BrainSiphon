# Virtual Staging & Photo Enhancement: data and feature specification

> Generated from the blueprint `real-estate/virtual-staging-and-photo-enhancement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Virtual Staging & Photo Enhancement · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Virtual Staging & Photo Enhancement": Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating only on easy, simple rooms hides failures in cluttered or oddly shaped ones.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Structure preservation | edge-map similarity between the original and staged image outside the furniture mask | A direct test that walls, windows and openings did not change | Mask the furniture region, otherwise added furniture lowers the score |   |   |   |
| Lighting consistency | angle between the dominant shadow direction in the room and on the added furniture | Mismatched shadows make the image look fake | Estimate light from fixed features, because windows and lamps vary |   |   |   |
| Style fit | style classifier score against the chosen target style such as modern or traditional | Consistent style helps buyers imagine the space | Taste differs by market, so validate with local raters |   |   |   |
| Disclosure flag | presence of the visible label detected in the final image | Compliance can be checked automatically and not left to people | Test on images after portal resizing and cropping |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Honesty | Furniture added only inside the existing geometry with structure preserved | Edits that move walls, enlarge windows or improve views | A misleading image is a misrepresentation and a legal risk, however attractive it looks |
| Fidelity | Geometry-preserving edits driven by depth and edge maps | Free-form generation from a text prompt | Free generation invents a room that no longer matches reality, and buyers feel misled at the viewing |
| Labelling | A visible staged label stamped on the image itself | Edits recorded only in metadata | Metadata is stripped by portals, so a hidden edit reaches buyers unlabelled |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Prompt wording | Changes output from run to run without a link to image honesty or appeal |
| Seed | Random variation between renders that should not drive a decision |
| Render time | Reflects server load, not the quality of the image |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Structure preservation inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: mask the furniture region, otherwise added furniture lowers the score. |
| Lighting consistency inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: estimate light from fixed features, because windows and lamps vary. |
| Style fit inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: taste differs by market, so validate with local raters. |
| Disclosure flag inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: test on images after portal resizing and cropping. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: virtual_staging_and_photo_enhancement_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: structure_preservation, type: double, nullable: false }
    - { name: lighting_consistency, type: double, nullable: false }
    - { name: style_fit, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Structure preservation and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Lighting consistency against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Structure preservation, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE virtual_staging_and_photo_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE virtual_staging_and_photo_detections (
  frame_id TEXT NOT NULL REFERENCES virtual_staging_and_photo_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE virtual_staging_and_photo_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Virtual Staging & Photo Enhancement": Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Structure preservation | Edge-map similarity between the original and staged image outside the furniture mask. A direct test that walls, windows and openings did not change. | Leakage risk to design against: Mask the furniture region, otherwise added furniture lowers the score. |
| A signal-versus-noise trap in this use case: Honesty | The true signal is furniture added only inside the existing geometry with structure preserved; the common noise is edits that move walls, enlarge windows or improve views. | A misleading image is a misrepresentation and a legal risk, however attractive it looks. |

**Ask the experts**

- [ ] What exactly does "Every staged image carries a visible label and the original is always one click away" mean in practice for virtual staging & photo enhancement: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Structure preservation" and "Lighting consistency", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Listing views" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating only on easy, simple rooms hides failures in cluttered or oddly shaped ones, and who can confirm the cut-off times and splits?
- [ ] How often does "Wrong scale furniture" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Days on market | The number of days a listing takes to go under contract. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Asking rent | The rent advertised for a unit, which is usually higher than the rent actually signed. |
| Security deposit | Money held against damage or unpaid rent, returned after deductions at move-out. |
| Setpoint | The target temperature or other value a control system tries to maintain. |
| Change order | A formal change to the construction contract scope, price or schedule. |
| Zoning | Local rules that limit how land can be used and built on, such as height, density and use. |
| Permit | Official approval to build, alter or occupy a structure. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| OCR / text detection | Finding and reading text in images. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
