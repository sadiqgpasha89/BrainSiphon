# Appraisal Review & Valuation Anomaly Detection: data and feature specification

> Generated from the blueprint `real-estate/appraisal-review-and-valuation-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Appraisal Review & Valuation Anomaly Detection · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Appraisal Review & Valuation Anomaly Detection": Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Confirmed issues are those that defaulted.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Appraisal to AVM gap | log difference scaled by AVM interval | Core signal | AVM coverage |   |   |   |
| Comparable selection quality | similarity of chosen vs available comps | Cherry-picking | Comp pool |   |   |   |
| Appraiser history | past review outcomes | Pattern | Fairness |   |   |   |
| Narrative inconsistency | text contradicting the data | Quality | Text extraction |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Deviation | Gap between appraisal and independent AVM adjusted for confidence | Any gap | Thin markets have wide AVM error |
| Comparables | Quality of selected comps | Count | Cherry-picked comps are the main issue |
| Pattern | Appraiser-level patterns over many reports | Single reports | Inflation shows as a pattern |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Report length | style |
| Appraiser firm | weak |
| Photo count | style |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Appraisal to AVM gap inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: AVM coverage. |
| Comparable selection quality inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: comp pool. |
| Appraiser history inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: fairness. |
| Narrative inconsistency inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: text extraction. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: appraisal_review_and_valuation_anomaly_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: appraisal_to_avm_gap, type: double, nullable: false }
    - { name: comparable_selection_quality, type: double, nullable: false }
    - { name: appraiser_history, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Appraisal to AVM gap and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Comparable selection quality against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Appraisal to AVM gap, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CIC-IDS2017 intrusion detection | https://www.unb.ca/cic/datasets/ids-2017.html | Research use with citation (see the page) | Labelled network flows with benign traffic and common attacks over five days | Lab traffic; known labelling issues in places. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| NSL-KDD | https://www.unb.ca/cic/datasets/nsl.html | Research use with citation (see the page) | A cleaned version of the classic KDD Cup 99 intrusion data | Very old; use only to test code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Ames Housing (De Cock) | https://jse.amstat.org/v19n3/decock.pdf | Published for teaching use; see the paper | 2,930 home sales from Ames, Iowa with 80 attributes, written up in a paper that explains every field and the data-cleaning steps | One mid-sized US city over five years: no photos, no micro-market detail and a single price regime. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE appraisal_review_and_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE appraisal_review_and_fields (
  document_id TEXT NOT NULL REFERENCES appraisal_review_and_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE appraisal_review_and_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Appraisal Review & Valuation Anomaly Detection": Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| How a property is valued: comparables, income and cost | Appraisers value a property three ways: the sales comparison approach (what similar homes sold for, adjusted for differences), the income approach (the rent a property can earn, converted to value with a capitalisation rate) and the cost approach (land plus rebuilding cost less depreciation). An automated valuation model usually imitates the first, with the second for investment property. | The method you imitate decides your features, your labels and the audience that will trust your number. |
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Why property data is sparse, lagged and local | A given home sells once every seven to ten years, so most properties have no recent price. Records are kept by local registries with varying quality, sales are recorded weeks after the contract, and prices differ across a single street because of schools, noise and views. | Training and test sets must be split by time and area, and models must say how little they know in a thin market. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Appraisal to AVM gap | Log difference scaled by AVM interval. Core signal. | Leakage risk to design against: AVM coverage. |
| A signal-versus-noise trap in this use case: Deviation | The true signal is gap between appraisal and independent AVM adjusted for confidence; the common noise is any gap. | Thin markets have wide AVM error. |

**Ask the experts**

- [ ] What exactly does "Reviewer sees the evidence" mean in practice for appraisal review & valuation anomaly detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Appraisal to AVM gap" and "Comparable selection quality", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Valuation losses avoided" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: confirmed issues are those that defaulted, and who can confirm the cut-off times and splits?
- [ ] How often does "Unique property" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Comparable (comp) | A recent sale of a similar nearby property used to estimate the value of the subject property. |
| AVM | Automated valuation model: software that estimates a property's market value from data instead of an on-site appraisal. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| Hedonic model | A regression that explains price from property characteristics such as size, rooms and location. |
| LTV | Loan-to-value ratio: loan amount divided by property value. |
| Days on market | The number of days a listing takes to go under contract. |
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| Steering | Guiding people toward or away from neighbourhoods based on protected characteristics. |
| Assessed value | The value a tax authority assigns to a property for property tax. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| F1 score | The harmonic mean of precision and recall. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
