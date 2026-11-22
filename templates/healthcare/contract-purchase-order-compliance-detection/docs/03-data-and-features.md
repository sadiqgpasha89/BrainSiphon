# Contract vs Purchase Order Compliance Detection: data and feature specification

> Generated from the blueprint `healthcare/contract-purchase-order-compliance-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contract vs Purchase Order Compliance Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Contract vs Purchase Order Compliance Detection": Detect purchase orders that violate contracted price, supplier, volume, term, approval or purchasing-channel conditions by extracting contract terms and testing each order line against them. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Checking orders against superseded terms.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Price variance to schedule | order price minus contracted price for the item and tier | The main compliance test | Contract version at order date |   |   |   |
| Channel and supplier match | whether supplier and channel match the contract | Off-contract buying | Contract scope tables |   |   |   |
| Volume tier position | cumulative volume against tier thresholds | Tiered prices depend on it | Cumulative at order date |   |   |   |
| Approval chain completeness | required approvals present | Policy compliance | Policy version |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Terms | Structured contract terms with source clauses | Free-text reading at check time | Rules need stable structured terms |
| Amendments | Effective-dated amendments and supersession | The base contract only | The wrong price is checked against an obsolete term |
| Matching | Catalogue and contract item identifiers | Fuzzy text on item names | A false match flags a legitimate order |
| Interpretation | Owner confirms ambiguous clauses | Model interpretation as final | Legal meaning is a human call |
| Exposure | Variance times volume with stated assumptions | Count of exceptions | Finance acts on value |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Buyer name | not a compliance driver |
| Order free-text note | noisy |
| Order entry time | process artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Price variance to schedule inputs | Procurement | Contract repository | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract version at order date. |
| Channel and supplier match inputs | Contract management | Procurement and accounts-payable system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: contract scope tables. |
| Volume tier position inputs | Supply chain finance | Supplier and item master data | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: cumulative at order date. |
| Approval chain completeness inputs | Legal | Approval policy register | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: policy version. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: contract_purchase_order_compliance_inputs.v1
owner: procurement@example.com
system_of_record: Contract repository
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: price_variance_to_schedule, type: double, nullable: false }
    - { name: channel_and_supplier_match, type: double, nullable: false }
    - { name: volume_tier_position, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Price variance to schedule and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Channel and supplier match against Contract repository
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Price variance to schedule, traces back to Contract repository; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE contract_purchase_order_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE contract_purchase_order_fields (
  document_id TEXT NOT NULL REFERENCES contract_purchase_order_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE contract_purchase_order_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Contract vs Purchase Order Compliance Detection": Detect purchase orders that violate contracted price, supplier, volume, term, approval or purchasing-channel conditions by extracting contract terms and testing each order line against them. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alert fatigue and the response workflow | Nurses and physicians see many alerts per shift. Alerts that fire too often are ignored or disabled, and an alert is only useful if a named person knows what to do within a set time. Hospital quality programmes, such as the SEP-1 bundle in the United States, define the care steps that should follow suspected sepsis. | The right metric is sensitivity and lead time at an agreed alert burden, agreed with ward leadership before modelling. |
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Price variance to schedule | Order price minus contracted price for the item and tier. The main compliance test. | Leakage risk to design against: Contract version at order date. |
| A signal-versus-noise trap in this use case: Terms | The true signal is structured contract terms with source clauses; the common noise is free-text reading at check time. | Rules need stable structured terms. |

**Ask the experts**

- [ ] What exactly does "Contract terms are extracted with page and clause provenance and a human validates each contract once" mean in practice for contract vs purchase order compliance detection: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Price variance to schedule" and "Channel and supplier match", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Compliant spend share" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: checking orders against superseded terms, and who can confirm the cut-off times and splits?
- [ ] How often does "Contract amended retroactively" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Bundle (SEP-1) | A checklist of timed care steps for suspected sepsis, such as lactate, cultures, antibiotics and fluids. |
| Alert burden | How many alerts clinicians receive per unit of care, which has to stay low enough that they keep responding. |
| Prior authorisation | Insurer approval required before a treatment or drug is covered. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Eligibility criteria | The rules that determine whether a patient may join a clinical trial. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Tweedie / Poisson loss | Losses for non-negative outcomes with many zeros or counts, such as claims. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
