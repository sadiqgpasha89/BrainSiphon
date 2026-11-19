# Tenant Screening & Affordability Assessment: data and feature specification

> Generated from the blueprint `real-estate/tenant-screening-and-affordability-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tenant Screening & Affordability Assessment · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Tenant Screening & Affordability Assessment": Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Outcomes are seen only for applicants who were accepted, so the model never learns about the rejected ones.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Rent-to-income ratio | monthly rent divided by verified monthly gross income | The core affordability measure that landlords and regulators accept | Only count income verified from a payroll or bank source |   |   |   |
| Rental payment history | months of on-time rent payments from reporting agencies or landlord references | Direct evidence of the behaviour being predicted | Reporting is patchy, so absence is not evidence of a problem |   |   |   |
| Income stability | months in the current role and income variance over 12 months | Stable income predicts steady payment | Gig and seasonal work look unstable without being risky, so model them separately |   |   |   |
| Document authenticity | forensic score for edits, template reuse and metadata mismatches | Catches forged payslips and statements | False alarms reject honest applicants, so route flagged files to a person |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Affordability | Verified income compared with rent and other commitments | A credit score on its own | A thin file belongs to many reliable tenants, and a score alone rejects them |
| Fairness | Error rates monitored for each protected group | Overall accuracy | A model that is accurate on average can still reject one group at a much higher rate, which breaches fair-housing law |
| Evidence | Documents verified against an independent source | Self-reported income and employment | Forged payslips are common, and an unverified figure is the weakest evidence |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Name | A protected characteristic in many places and no predictor of payment |
| Postcode of origin | A proxy for race and income that breaches fair-housing rules |
| Social media | Unreliable, unverifiable and intrusive, and it invites discrimination |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Rent-to-income ratio inputs | Portfolio data team | Property and portfolio management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: only count income verified from a payroll or bank source. |
| Rental payment history inputs | Property operations | Listing (MLS) feed and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: reporting is patchy, so absence is not evidence of a problem. |
| Income stability inputs | Geospatial team | Building management system (BMS) and IoT hub | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: gig and seasonal work look unstable without being risky, so model them separately. |
| Document authenticity inputs | Portfolio data team | Property and portfolio management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: false alarms reject honest applicants, so route flagged files to a person. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: tenant_screening_and_affordability_inputs.v1
owner: portfolio-data-team@example.com
system_of_record: Property and portfolio management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: rent_to_income_ratio, type: double, nullable: false }
    - { name: rental_payment_history, type: double, nullable: false }
    - { name: income_stability, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Rent-to-income ratio and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rental payment history against Property and portfolio management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Rent-to-income ratio, traces back to Property and portfolio management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| UCI Heart Disease | https://archive.ics.uci.edu/dataset/45/heart+disease | CC BY 4.0 (see the UCI page) | Small clinical dataset with a heart-disease label | Tiny; use only to test pipeline and calibration code. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GH Archive | https://www.gharchive.org/ | Public event data (see the site) | Hourly public GitHub events: pushes, pull requests, issues and reviews | Public repositories only; bot noise. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE tenant_screening_and_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE tenant_screening_and_fields (
  document_id TEXT NOT NULL REFERENCES tenant_screening_and_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE tenant_screening_and_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Real estate is a market of unique, slow-moving and very high-value assets: every property differs, sales are rare, prices are only observed when a deal closes, and what happens depends on the street as much as the city. That gives property data its character: sparse, local, lagged and full of human judgement (appraisers, agents, assessors), and it is regulated by fair-housing, lending and building rules that limit which signals a model may use. Most systems here support a person who owns the decision, whether a lender, appraiser, leasing manager, underwriter or site engineer, and the main skill is knowing what the data cannot see. For this use case, "Tenant Screening & Affordability Assessment": Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Fair housing and non-discrimination | Housing law in many countries prohibits discrimination by race, religion, sex, disability, family status and similar attributes, in advertising, screening, pricing and lending. Proxies such as postcode, language or school-district descriptions can create unlawful steering even if no protected attribute is used. | Every real-estate model that ranks, prices, screens or describes must be tested for disparate outcomes and for proxies, and the test is part of the product. |
| Leasing, rent and property operations | A landlord sets rent, screens applicants, collects payments, handles maintenance and decides renewals. Rent is observed as an asking rent and a signed rent, which differ, and tenant behaviour is shaped by notice periods, rent-control rules and payment cycles. | Operational models should support care and service (early outreach, correct dispatch) as much as revenue, and rules such as rent caps are hard constraints. |
| Commercial real estate: leases, rent roll and income | Commercial properties earn rent under long, negotiated leases with options, breaks, indexation and incentives. The rent roll lists each tenant, rent and expiry, net operating income is rent minus operating costs, and value is set by income and the cap rate investors accept. | Lease terms are the data, and most of them are in documents, so extraction quality directly limits forecasting and valuation. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Rent-to-income ratio | Monthly rent divided by verified monthly gross income. The core affordability measure that landlords and regulators accept. | Leakage risk to design against: Only count income verified from a payroll or bank source. |
| A signal-versus-noise trap in this use case: Affordability | The true signal is verified income compared with rent and other commitments; the common noise is a credit score on its own. | A thin file belongs to many reliable tenants, and a score alone rejects them. |

**Ask the experts**

- [ ] What exactly does "Complies with fair-housing and credit-reporting law in each jurisdiction" mean in practice for tenant screening & affordability assessment: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Rent-to-income ratio" and "Rental payment history", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Delinquency rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: outcomes are seen only for applicants who were accepted, so the model never learns about the rejected ones, and who can confirm the cut-off times and splits?
- [ ] How often does "No credit history" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Fair housing | Laws prohibiting discrimination in selling, renting, advertising and financing housing. |
| Delinquency | A tenant being late on rent beyond the grace period. |
| COD | Coefficient of dispersion: a measure of how uniformly assessments relate to sale prices; lower is more uniform. |
| Appraisal | A professional opinion of a property's market value, usually required by a lender. |
| Security deposit | Money held against damage or unpaid rent, returned after deductions at move-out. |
| Assessed value | The value a tax authority assigns to a property for property tax. |
| Cap rate | Capitalisation rate: net operating income divided by property value, used to value income-producing property. |
| NOI | Net operating income: rental income minus operating expenses, before debt service and tax. |
| Steering | Guiding people toward or away from neighbourhoods based on protected characteristics. |
| Data room | A secure online repository of documents shared during a property sale or due diligence. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
