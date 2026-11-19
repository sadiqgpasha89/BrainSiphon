# Automated Valuation Model (AVM): data and feature specification

> Generated from the blueprint `real-estate/automated-valuation-model` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Valuation Model (AVM) · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Automated Valuation Model (AVM)": Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on sales after the valuation date leaks the trend.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Comparable sale density | count and recency of sales within 0.5 km and 90 days | Thin markets give wide errors | Only sales that closed before the valuation date |   |   |   |
| Price per square metre by micro-area | trailing median adjusted for size and type | Anchors the local level | Neighbourhood boundaries must be stable |   |   |   |
| Condition score from photos | vision model grade of kitchen, bathroom and exterior | Captures the unrecorded | Listing photos are staged and flattering |   |   |   |
| Renovation permits | permits for kitchen, extension or roof in the last 10 years | Evidence of upgrades | Permit data quality varies by municipality |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Target | Sale price at the contract date, adjusted to a common date | Listing price or assessed value | Listing prices are aspirations and assessed values lag the market by years |
| Local | Micro-market effects such as school zone, street and view | City-level averages | A 10% price gap can exist across one street |
| Condition | Condition and renovation state from photos and permits | Square footage and bedroom count only | Two identical houses differ by 20% in condition |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Listing description adjectives | marketing language with little extra signal |
| Days since the listing photo upload | portal behaviour, not value |
| Owner name | no causal link and a privacy risk |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Comparable sale density inputs | Valuation and collateral analytics | Property registry, cadastre and assessor records | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: only sales that closed before the valuation date. |
| Price per square metre by micro-area inputs | Property data office | Listing and MLS data (licensed) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: neighbourhood boundaries must be stable. |
| Condition score from photos inputs | Appraisal operations | Transaction and deed records | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: listing photos are staged and flattering. |
| Renovation permits inputs | Valuation and collateral analytics | Appraisal and collateral-management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: permit data quality varies by municipality. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: automated_valuation_model_inputs.v1
owner: valuation-and-collateral-analytics@example.com
system_of_record: Property registry, cadastre and assessor records
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: comparable_sale_density, type: double, nullable: false }
    - { name: price_per_square_metre_by_micro_area, type: double, nullable: false }
    - { name: condition_score_from_photos, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Comparable sale density and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Price per square metre by micro-area against Property registry, cadastre and assessor records
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Comparable sale density, traces back to Property registry, cadastre and assessor records; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Ames Housing (De Cock) | https://jse.amstat.org/v19n3/decock.pdf | Published for teaching use; see the paper | 2,930 home sales from Ames, Iowa with 80 attributes, written up in a paper that explains every field and the data-cleaning steps | One mid-sized US city over five years: no photos, no micro-market detail and a single price regime. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| California Housing (scikit-learn) | https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html | BSD-3 code; census-derived data | 20,640 census block groups with median house value, income and location, loaded with one function call | Block-group medians from 1990, not individual homes; values are capped. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Inside Airbnb | https://insideairbnb.com/get-the-data/ | Creative Commons CC0 1.0 for most cities (check each city page) | Listing, calendar and review data for many cities, scraped from public Airbnb pages and refreshed regularly | Scraped, not official; calendar availability does not equal bookings and prices are asking prices. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE automated_valuation_model_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE automated_valuation_model_detections (
  frame_id TEXT NOT NULL REFERENCES automated_valuation_model_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE automated_valuation_model_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Automated Valuation Model (AVM)": Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Comparable sale density | Count and recency of sales within 0.5 km and 90 days. Thin markets give wide errors. | Leakage risk to design against: Only sales that closed before the valuation date. |
| A signal-versus-noise trap in this use case: Target | The true signal is sale price at the contract date, adjusted to a common date; the common noise is listing price or assessed value. | Listing prices are aspirations and assessed values lag the market by years. |

**Ask the experts**

- [ ] What exactly does "Median error under 6% with a published confidence score" mean in practice for automated valuation model (avm): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Comparable sale density" and "Price per square metre by micro-area", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Appraisal orders avoided" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on sales after the valuation date leaks the trend, and who can confirm the cut-off times and splits?
- [ ] How often does "Thin market" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| AVM | Automated valuation model: software that estimates a property's market value from data instead of an on-site appraisal. |
| Comparable (comp) | A recent sale of a similar nearby property used to estimate the value of the subject property. |
| Days on market | The number of days a listing takes to go under contract. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Repeat-sales index | A price index built from price changes of the same property across successive sales. |
| Sale-to-list ratio | Final sale price divided by the last listing price. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| LTV | Loan-to-value ratio: loan amount divided by property value. |
| MLS | Multiple listing service: a shared database of properties for sale among agents in a region. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Shortcut learning | A model using an easy but irrelevant cue that happens to correlate with the label. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
