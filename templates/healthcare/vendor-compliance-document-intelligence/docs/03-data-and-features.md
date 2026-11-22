# Vendor Compliance Document Intelligence: data and feature specification

> Generated from the blueprint `healthcare/vendor-compliance-document-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Compliance Document Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Vendor Compliance Document Intelligence": Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Splitting by page not by vendor.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Field confidence | calibrated confidence per extracted field | Directs review | Held-out document groups |   |   |   |
| Coverage versus requirement | extracted limits against required limits | Core compliance test | Requirement catalogue version |   |   |   |
| Named-entity agreement | vendor and insured names versus vendor master | Detects wrong-entity evidence | Master as at scoring |   |   |   |
| Expiry proximity | days to the document expiry | Alerting | Document dates |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Provenance | Value with page, region and confidence | Value alone | Reviewers must see the source to trust a value |
| Rules | Deterministic coverage and expiry rules | Model guess at validity | Validity is a rule not a prediction |
| Materiality | Review queue for ambiguous or material evidence | Auto-accept above a score | Coverage limits and named insureds carry legal weight |
| Verification | Issuer verification where available | Extraction as verification | A scanned certificate can be forged |
| Formats | Layout-aware extraction across certificate types | One template | Vendors submit many layouts |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Logo and letterhead | layout style |
| Document file name | not content |
| Page count | not validity |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Field confidence inputs | Vendor management | Vendor credentialing and access management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: held-out document groups. |
| Coverage versus requirement inputs | Compliance | Vendor master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: requirement catalogue version. |
| Named-entity agreement inputs | Risk management | Contract repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: master as at scoring. |
| Expiry proximity inputs | Procurement | Document repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: document dates. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: vendor_compliance_document_intelligence_inputs.v1
owner: vendor-management@example.com
system_of_record: Vendor credentialing and access management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: field_confidence, type: double, nullable: false }
    - { name: coverage_versus_requirement, type: double, nullable: false }
    - { name: named_entity_agreement, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Field confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Coverage versus requirement against Vendor credentialing and access management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Field confidence, traces back to Vendor credentialing and access management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE vendor_compliance_document_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE vendor_compliance_document_fields (
  document_id TEXT NOT NULL REFERENCES vendor_compliance_document_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE vendor_compliance_document_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Vendor Compliance Document Intelligence": Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Regulation, privacy and trust in clinical AI | Clinical software may be regulated as a medical device, patient data is protected by privacy law, models must be validated on the population where they will run, and clinicians need to understand and override outputs. Federated approaches let hospitals learn together without sharing records. | Plan for validation evidence, post-deployment monitoring and de-identification from the first design review. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Field confidence | Calibrated confidence per extracted field. Directs review. | Leakage risk to design against: Held-out document groups. |
| A signal-versus-noise trap in this use case: Provenance | The true signal is value with page, region and confidence; the common noise is value alone. | Reviewers must see the source to trust a value. |

**Ask the experts**

- [ ] What exactly does "Every extracted value links to its page and region with a confidence" mean in practice for vendor compliance document intelligence: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Field confidence" and "Coverage versus requirement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Reviewer time per document" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: splitting by page not by vendor, and who can confirm the cut-off times and splits?
- [ ] How often does "Certificate lists several insured parties" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Pathogenic variant | A genetic change that causes or raises the risk of disease. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| F1 score | The harmonic mean of precision and recall. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
