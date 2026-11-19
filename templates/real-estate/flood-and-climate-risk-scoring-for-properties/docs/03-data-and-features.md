# Flood & Climate Risk Scoring for Properties: data and feature specification

> Generated from the blueprint `real-estate/flood-and-climate-risk-scoring-for-properties` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Flood & Climate Risk Scoring for Properties · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Flood & Climate Risk Scoring for Properties": Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Claims come from a few events, so models fit those events and miss others.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Elevation above river | metres between the lowest floor and the 100-year flood level from LiDAR data | The most direct driver of river flooding | LiDAR resolution and age limit precision |   |   |   |
| Distance to water | distance to the nearest river, coast or drainage channel along the flow path | Flood exposure falls with distance | Straight-line distance misleads, so use flow paths |   |   |   |
| Vegetation fuel | fuel load and density within 100 metres from imagery | A key driver of wildfire spread | Seasonal, so use the dry-season image |   |   |   |
| Historic claims density | insurance claims per property in the area over 20 years | Evidence of past damage | Privacy-restricted, and claims depend on take-up |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Elevation | Property-level elevation and local drainage | The flood zone designation alone | Flood zones are coarse and place houses on either side of a line at very different risk |
| Scenario | A climate scenario with a stated horizon | A single future | Futures differ, and a single number hides how uncertain the outlook is |
| Vulnerability | Building vulnerability, such as basement, floor height and materials | Hazard alone | Two neighbours with the same hazard suffer different loss depending on how the building is built |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Owner | Owner identity has no physical link to hazard |
| Address string | The text of an address is not a risk factor and can encode area bias |
| Photo | A listing photo says nothing about flood or fire exposure |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Elevation above river inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: liDAR resolution and age limit precision. |
| Distance to water inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: straight-line distance misleads, so use flow paths. |
| Vegetation fuel inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: seasonal, so use the dry-season image. |
| Historic claims density inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: privacy-restricted, and claims depend on take-up. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: flood_and_climate_risk_scoring_for_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: elevation_above_river, type: double, nullable: false }
    - { name: distance_to_water, type: double, nullable: false }
    - { name: vegetation_fuel, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Elevation above river and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Distance to water against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Elevation above river, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Porto Seguro Safe Driver Prediction | https://www.kaggle.com/c/porto-seguro-safe-driver-prediction | Competition rules; free Kaggle login | 600K insurance policies with anonymised features and a claim-filed label | Anonymised features limit domain feature work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE flood_and_climate_risk_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE flood_and_climate_risk_detections (
  frame_id TEXT NOT NULL REFERENCES flood_and_climate_risk_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE flood_and_climate_risk_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Flood & Climate Risk Scoring for Properties": Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Climate, flood and property risk | Properties face flood, wildfire, heat and wind risk that depends on elevation, drainage, vegetation and building construction, and on the climate scenario chosen. Lenders and insurers price and limit exposure, and buyers increasingly ask for property-level scores. | Scores must state the scenario, the date of the hazard data and the uncertainty, because they affect prices and insurability. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Buildings as systems: HVAC, energy and sensors | Buildings run on heating, ventilation and air-conditioning plants controlled by a building management system with sensors for temperature, CO2, occupancy and energy. Comfort, cost and carbon are traded off, and equipment ages and fails in patterns visible in sensor data. | Control models must stay inside comfort and safety limits and fall back to the schedule when sensors fail. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Elevation above river | Metres between the lowest floor and the 100-year flood level from LiDAR data. The most direct driver of river flooding. | Leakage risk to design against: LiDAR resolution and age limit precision. |
| A signal-versus-noise trap in this use case: Elevation | The true signal is property-level elevation and local drainage; the common noise is the flood zone designation alone. | Flood zones are coarse and place houses on either side of a line at very different risk. |

**Ask the experts**

- [ ] What exactly does "Methodology published so that users can judge and challenge a score" mean in practice for flood & climate risk scoring for properties: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Elevation above river" and "Distance to water", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Loss ratio" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: claims come from a few events, so models fit those events and miss others, and who can confirm the cut-off times and splits?
- [ ] How often does "New defences" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Floodplain | Land that is likely to flood in a given event, such as a one-in-a-hundred-year flood. |
| Days on market | The number of days a listing takes to go under contract. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Redlining | Denying or worsening services in certain areas based on the demographics of the area. |
| Security deposit | Money held against damage or unpaid rent, returned after deductions at move-out. |
| Take-off | Measuring quantities from drawings to estimate materials and cost. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| Multiple-instance learning | Learning from a bag of patches with only a bag-level label, as in whole-slide pathology. |
| OCR / text detection | Finding and reading text in images. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
