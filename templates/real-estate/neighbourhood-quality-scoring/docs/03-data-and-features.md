# Neighbourhood Quality Scoring: data and feature specification

> Generated from the blueprint `real-estate/neighbourhood-quality-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Neighbourhood Quality Scoring · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Neighbourhood Quality Scoring": Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Survey calibration data covers wealthy and responsive areas better than others.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Walk time to amenities | routing time on the pedestrian network to the nearest grocery, school, park and transit stop | A directly interpretable livability measure that matches how residents experience the area | Use the current map snapshot for training labels and do not mix in later openings |   |   |   |
| Street imagery greenery | share of pixels classed as tree canopy in street-level images, averaged over each cell | Green cover tracks comfort, heat and perceived quality | Images are seasonal, so normalise by capture month and never compare winter to summer |   |   |   |
| Business openings | net new registered businesses in the cell over 24 months, divided by existing businesses | Momentum and vibrancy that a snapshot cannot show | Registrations lag opening, so count by registration date and exclude the scored quarter |   |   |   |
| Noise exposure | modelled decibel level from road, rail and flight-path data at the cell centroid | Noise is a stable driver of livability that residents rank highly | The model assumes typical traffic, so re-run it after a major route change |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Fairness | Scores built only from objective amenity, access and environment data that can be named and audited | Crime counts, school-rating averages or income and demographic proxies | Those inputs recreate historic redlining and a score that looks neutral becomes a legal and reputational risk |
| Scale | Block-level scores from small grid cells with enough observations to be stable | City or postcode averages | Quality changes from one street to the next, and an average hides the exact variation a buyer is paying for |
| Change | The trajectory of an area, such as net new businesses and permits over two years | A single static snapshot score | A buyer or investor cares where the area is heading, and gentrification is invisible in a snapshot |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Area name | A label that the model can memorise, which would reproduce the reputation of a name instead of the facts on the ground |
| Listing agent | Who sells a home in the area has no bearing on the area itself and leaks market share, not quality |
| Photo brightness | An artefact of camera and time of day in the source images, not of the neighbourhood |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Walk time to amenities inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use the current map snapshot for training labels and do not mix in later openings. |
| Street imagery greenery inputs | Property operations | Listing (MLS) feed and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: images are seasonal, so normalise by capture month and never compare winter to summer. |
| Business openings inputs | Geospatial team | Building management system (BMS) and IoT hub | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: registrations lag opening, so count by registration date and exclude the scored quarter. |
| Noise exposure inputs | Portfolio data team | Property and portfolio management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: the model assumes typical traffic, so re-run it after a major route change. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: neighbourhood_quality_scoring_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: walk_time_to_amenities, type: double, nullable: false }
    - { name: street_imagery_greenery, type: double, nullable: false }
    - { name: business_openings, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Walk time to amenities and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Street imagery greenery against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Walk time to amenities, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE neighbourhood_quality_scoring_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE neighbourhood_quality_scoring_detections (
  frame_id TEXT NOT NULL REFERENCES neighbourhood_quality_scoring_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE neighbourhood_quality_scoring_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Neighbourhood Quality Scoring": Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Walk time to amenities | Routing time on the pedestrian network to the nearest grocery, school, park and transit stop. A directly interpretable livability measure that matches how residents experience the area. | Leakage risk to design against: Use the current map snapshot for training labels and do not mix in later openings. |
| A signal-versus-noise trap in this use case: Fairness | The true signal is scores built only from objective amenity, access and environment data that can be named and audited; the common noise is crime counts, school-rating averages or income and demographic proxies. | Those inputs recreate historic redlining and a score that looks neutral becomes a legal and reputational risk. |

**Ask the experts**

- [ ] What exactly does "No score may use race, ethnicity, religion or any proxy for them" mean in practice for neighbourhood quality scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Walk time to amenities" and "Street imagery greenery", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Search engagement with area filters" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: survey calibration data covers wealthy and responsive areas better than others, and who can confirm the cut-off times and splits?
- [ ] How often does "New development" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Redlining | Denying or worsening services in certain areas based on the demographics of the area. |
| Days on market | The number of days a listing takes to go under contract. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Steering | Guiding people toward or away from neighbourhoods based on protected characteristics. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| Zoning | Local rules that limit how land can be used and built on, such as height, density and use. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Anomaly detection (visual) | Finding defects as deviations from a model of normal images, useful when defects are rare. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Transfer learning | Starting from a model pretrained on a large image set and adapting it to a small task dataset. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
