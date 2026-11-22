# Vendor Credential Compliance Risk Scoring: data and feature specification

> Generated from the blueprint `healthcare/vendor-credential-compliance-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Credential Compliance Risk Scoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Vendor Credential Compliance Risk Scoring": Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Scoring on records already remediated.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Days to nearest expiry | minimum days to expiry across required items | Imminent lapse risk | Use document dates |   |   |   |
| Missing requirement count | requirements with no valid evidence | Direct compliance gap | Catalogue version |   |   |   |
| Visit frequency and areas | recent visit frequency and clinical areas visited | Higher exposure needs stricter checks | Past visits only |   |   |   |
| Historical lapse rate | share of past cycles with a lapse for the vendor | Predicts friction | Strictly earlier cycles |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Compliance | Rule check of each requirement against evidence | A learned score of compliance | Facilities must show exactly which requirement fails |
| Evidence | Document and date linked to each requirement | Self-attestation only | Attestations need verification where policy requires it |
| Risk | Prioritisation by expiry proximity and criticality | Binary pass-fail | Reviewers need a queue not a list |
| Decision | Recommendation to access staff | Automatic denial | Access decisions are policy decisions |
| Consistency | Cross-document identity and date checks | Single document trust | Mismatches reveal errors |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Vendor company size | not a compliance cause |
| Representative name | personal and not predictive |
| Visit purpose free text | noisy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Days to nearest expiry inputs | Vendor management | Vendor credentialing and access management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: use document dates. |
| Missing requirement count inputs | Facility security | Vendor master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: catalogue version. |
| Visit frequency and areas inputs | Infection prevention | Facility access and visitor management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: past visits only. |
| Historical lapse rate inputs | Compliance | Vendor credentialing and access management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: strictly earlier cycles. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: vendor_credential_compliance_risk_inputs.v1
owner: vendor-management@example.com
system_of_record: Vendor credentialing and access management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: days_to_nearest_expiry, type: double, nullable: false }
    - { name: missing_requirement_count, type: double, nullable: false }
    - { name: visit_frequency_and_areas, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Days to nearest expiry and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Missing requirement count against Vendor credentialing and access management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Days to nearest expiry, traces back to Vendor credentialing and access management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Give Me Some Credit | https://www.kaggle.com/c/GiveMeSomeCredit | Competition rules; free Kaggle login | 150,000 borrowers with delinquency outcomes, a small clean credit-scoring benchmark | Few features and no time axis; use it to test the scoring and calibration code only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Home Credit Default Risk | https://www.kaggle.com/c/home-credit-default-risk | Competition rules; free Kaggle login | Loan applications with bureau, instalment and credit-card history tables for default prediction | Many linked tables and heavy missingness; join with care to avoid leakage. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Diabetes 130-US Hospitals (UCI) | https://archive.ics.uci.edu/dataset/296/diabetes+130-us+hospitals+for+years+1999-2008 | CC BY 4.0 (see the UCI page) | 100K inpatient encounters with a 30-day readmission outcome | Old data and coarse features. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE vendor_credential_compliance_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE vendor_credential_compliance_fields (
  document_id TEXT NOT NULL REFERENCES vendor_credential_compliance_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE vendor_credential_compliance_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Vendor Credential Compliance Risk Scoring": Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Hospital operations and capacity | Hospitals schedule operating rooms, staff nurses, forecast emergency demand, manage beds and dispatch ambulances. Demand is lumpy, costs of waiting are asymmetric and safety limits on staffing are hard constraints. | Forecasts and schedules are judged by waiting time, overtime and safety margins, not average error. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Days to nearest expiry | Minimum days to expiry across required items. Imminent lapse risk. | Leakage risk to design against: Use document dates. |
| A signal-versus-noise trap in this use case: Compliance | The true signal is rule check of each requirement against evidence; the common noise is a learned score of compliance. | Facilities must show exactly which requirement fails. |

**Ask the experts**

- [ ] What exactly does "Rules-first validation decides compliance and the model only prioritises risk" mean in practice for vendor credential compliance risk scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Days to nearest expiry" and "Missing requirement count", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Lapsed credentials reaching a facility" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: scoring on records already remediated, and who can confirm the cut-off times and splits?
- [ ] How often does "Vendor submits late" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| Nurse staffing ratio | The number of patients per nurse permitted on a unit, often set by policy or law. |
| ICD / CPT | Code sets for diagnoses (ICD) and procedures (CPT) used in billing and reporting. |
| Claim denial | An insurer's refusal to pay a claim, often fixable with correct documentation. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| OR block time | Reserved operating room time given to surgeons or services. |
| Length of stay | How long a patient is admitted, a main driver of bed demand and cost. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
