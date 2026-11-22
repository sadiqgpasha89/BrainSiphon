# Healthcare Contract Price & Terms Benchmarking: data and feature specification

> Generated from the blueprint `healthcare/healthcare-contract-price-terms-benchmarking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Price & Terms Benchmarking · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Healthcare Contract Price & Terms Benchmarking": Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Comparing unnormalised units.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Normalised price percentile | position of the price within the comparable cohort | The main benchmark | Cohort at the contract date |   |   |   |
| Term favourability | score of payment, liability and termination terms against the cohort | Value beyond price | Extracted with provenance |   |   |   |
| Cohort size and dispersion | number of comparables and spread | Sets confidence | At analysis time |   |   |   |
| Volume-tier alignment | tier thresholds relative to actual volume | Explains price differences | Spend data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Cohort | Comparable items, tier, geography and term | All contracts for the item | Mismatched cohorts mislead |
| Normalisation | Unit and term normalised before comparison | Raw price | Differing units look like price gaps |
| Terms | Clause values compared where comparable | Price only | Payment and liability terms drive value |
| Confidence | Sample size and dispersion shown | Single median | Thin cohorts give false precision |
| Rights | Licensed sources with rights recorded | Unlicensed data | Misuse creates legal exposure |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Supplier prestige | not a benchmark |
| Contract negotiation date alone | confounds with market trends |
| Account manager | personal |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Normalised price percentile inputs | Procurement | Contract management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cohort at the contract date. |
| Term favourability inputs | Legal | Item and service taxonomy | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: extracted with provenance. |
| Cohort size and dispersion inputs | Finance | Procurement and spend system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: at analysis time. |
| Volume-tier alignment inputs | Contract management | Approved benchmark data store | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: spend data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: healthcare_contract_price_terms_inputs.v1
owner: procurement@example.com
system_of_record: Contract management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: normalised_price_percentile, type: double, nullable: false }
    - { name: term_favourability, type: double, nullable: false }
    - { name: cohort_size_and_dispersion, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Normalised price percentile and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Term favourability against Contract management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Normalised price percentile, traces back to Contract management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| California Housing (scikit-learn) | https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html | BSD-3 code; census-derived data | 20,640 census block groups with median house value, income and location, loaded with one function call | Block-group medians from 1990, not individual homes; values are capped. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE healthcare_contract_price_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE healthcare_contract_price_fields (
  document_id TEXT NOT NULL REFERENCES healthcare_contract_price_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE healthcare_contract_price_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Healthcare Contract Price & Terms Benchmarking": Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Onset is a constructed label, not an event | There is no clock that records when sepsis starts. Researchers reconstruct onset from the time infection was suspected (antibiotics ordered and cultures taken within a window) and the time organ dysfunction appeared. Different rules give onset times hours apart, and billing codes are later and noisier still. | Lead time is measured against this label. A sloppy onset definition makes lead time and sensitivity numbers meaningless. |
| Treatment leaks the label | Clinicians order antibiotics, cultures, fluids and lactate because they already suspect sepsis. Those orders are consequences of suspicion, and patients who are treated early may never reach the textbook definition. | Orders and diagnoses must stay out of the features, and treated patients need careful handling in the label, or you learn clinician behaviour instead of physiology. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Normalised price percentile | Position of the price within the comparable cohort. The main benchmark. | Leakage risk to design against: Cohort at the contract date. |
| A signal-versus-noise trap in this use case: Cohort | The true signal is comparable items, tier, geography and term; the common noise is all contracts for the item. | Mismatched cohorts mislead. |

**Ask the experts**

- [ ] What exactly does "Legal and procurement validate comparability and the right to use each benchmark source" mean in practice for healthcare contract price & terms benchmarking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Normalised price percentile" and "Term favourability", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Savings found from benchmark gaps" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: comparing unnormalised units, and who can confirm the cut-off times and splits?
- [ ] How often does "Few comparables" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Bundle (SEP-1) | A checklist of timed care steps for suspected sepsis, such as lactate, cultures, antibiotics and fluids. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
