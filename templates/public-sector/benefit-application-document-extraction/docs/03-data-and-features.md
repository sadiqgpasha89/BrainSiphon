# Benefit Application Document Extraction: data and feature specification

> Generated from the blueprint `public-sector/benefit-application-document-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Benefit Application Document Extraction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Benefit Application Document Extraction": Extract fields from payslips, bank statements, leases and IDs submitted with benefit applications so caseworkers review structured data rather than retyping. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Auto-fill with no confirmation.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Field confidence | confidence per extracted value | Review priority | Calibrated |   |   |   |
| Document type | the classified document type | Template choice | From the classifier |   |   |   |
| Cross-field consistency | totals and dates agreeing | Error check | Rules |   |   |   |
| Image quality | resolution and skew | Reliability | From the image |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Truth | Values confirmed by caseworkers | OCR text only | OCR can misread digits |
| Safety | Human confirmation | Auto-fill with no check | Wrong values change entitlements |
| Privacy | Minimal fields and short retention | Full document storage | Documents are sensitive |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Applicant name | irrelevant for extraction quality |
| Scan device | an artefact |
| File name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Field confidence inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibrated. |
| Document type inputs | Programme and policy owners | Tax, benefits and licensing systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the classifier. |
| Cross-field consistency inputs | City operations | GIS and asset management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rules. |
| Image quality inputs | Digital service delivery | Case management and CRM | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the image. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: benefit_application_document_extraction_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: field_confidence, type: double, nullable: false }
    - { name: document_type, type: double, nullable: false }
    - { name: cross_field_consistency, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Field confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Document type against Case management and CRM
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Field confidence, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE benefit_application_document_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE benefit_application_document_detections (
  frame_id TEXT NOT NULL REFERENCES benefit_application_document_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE benefit_application_document_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Benefit Application Document Extraction": Extract fields from payslips, bank statements, leases and IDs submitted with benefit applications so caseworkers review structured data rather than retyping. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Planning relies on forecasts with uncertainty | Housing, schools, transport and services are planned from population, demand and land-use forecasts that carry wide uncertainty, so scenarios matter more than single numbers. | A single forecast presented as certain can lock in the wrong capacity. |
| Fraud and error are different problems | Improper payments arise from fraud, administrative error and misunderstanding. Treating all of them as fraud leads to harmful accusations and chases the wrong cause. | Cases flagged by a model should be reviewed by a person and handled proportionately. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Field confidence | Confidence per extracted value. Review priority. | Leakage risk to design against: Calibrated. |
| A signal-versus-noise trap in this use case: Truth | The true signal is values confirmed by caseworkers; the common noise is oCR text only. | OCR can misread digits. |

**Ask the experts**

- [ ] What exactly does "Every extracted value links to its place in the image" mean in practice for benefit application document extraction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Field confidence" and "Document type", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Data entry time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: auto-fill with no confirmation, and who can confirm the cut-off times and splits?
- [ ] How often does "Handwritten forms" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Caseworker | An official who assesses and manages cases for individuals. |
| Eligibility | The rules that decide whether someone qualifies for a benefit or service. |
| Entitlement | A benefit or service a person has a right to. |
| Appeal | A formal challenge to a decision. |
| Improper payment | A payment made in error, whether from fraud or mistake. |
| Permit | Official permission to do something such as build. |
| Planning application | A request for permission to develop land. |
| Purpose limitation | The rule that data may only be used for the purpose it was collected for. |
| Pseudonymisation | Replacing identifiers with codes to reduce identification risk. |
| Welfare | Government support for people with low income or other need. |
| OCR / text detection | Finding and reading text in images. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Domain shift | A change in the images the model sees, such as a new camera or hospital. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
