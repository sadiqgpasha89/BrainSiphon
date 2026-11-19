# Document Workflow Classification & Extraction: data and feature specification

> Generated from the blueprint `saas/document-workflow-classification-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Document Workflow Classification & Extraction · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Document Workflow Classification & Extraction": Classify and extract fields from uploaded documents (contracts, forms, invoices) to automate customer workflows. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test documents from the same templates as training.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Field confidence margin | calibrated per-field confidence | Routing | Calibration |   |   |   |
| Layout similarity to exemplars | embedding of page layout | Template match | Exemplar set |   |   |   |
| Validation rule pass | business rules on fields | Correctness | Rule library |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Onboarding | Few-shot adaptation per tenant | Retrain a model per customer | Per-customer training doesn't scale |
| Review | Human-in-the-loop on low confidence | Fully automatic | Silent extraction errors break downstream workflows |

## Features to drop

| Feature | Why it is noise |
|---|---|
| File name | none |
| Upload time | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Field confidence margin inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibration. |
| Layout similarity to exemplars inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: exemplar set. |
| Validation rule pass inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: rule library. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: document_workflow_classification_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: field_confidence_margin, type: double, nullable: false }
    - { name: layout_similarity_to_exemplars, type: double, nullable: false }
    - { name: validation_rule_pass, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Field confidence margin and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Layout similarity to exemplars against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Field confidence margin, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE document_workflow_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE document_workflow_detections (
  frame_id TEXT NOT NULL REFERENCES document_workflow_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE document_workflow_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Document Workflow Classification & Extraction": Classify and extract fields from uploaded documents (contracts, forms, invoices) to automate customer workflows. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Data platforms, quality and ML operations | Data pipelines move events into warehouses; data quality checks catch schema and volume problems; ML platforms track models, drift, evaluation of language-model applications and costs. Gateways route requests between models by cost and quality. | Many model failures are data failures; monitoring inputs and outputs is as important as the model. |
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Shortcuts, domain shift and evaluation across sites | Vision models readily learn cues unrelated to the task: scanner markings, backgrounds, lighting, text overlays. Performance then collapses on a new device or site. Evaluation must hold out entire sites or cameras, and operating thresholds must be re-validated where they are deployed. | Split by physical item or patient, and always test on a site the model has not seen. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Field confidence margin | Calibrated per-field confidence. Routing. | Leakage risk to design against: Calibration. |
| A signal-versus-noise trap in this use case: Onboarding | The true signal is few-shot adaptation per tenant; the common noise is retrain a model per customer. | Per-customer training doesn't scale. |

**Ask the experts**

- [ ] What exactly does "Per-tenant document types" mean in practice for document workflow classification & extraction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Field confidence margin" and "Layout similarity to exemplars", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Straight-through processing rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test documents from the same templates as training, and who can confirm the cut-off times and splits?
- [ ] How often does "Customer changes their form template" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Embedding | A vector representing the meaning of text, used for similarity search that tolerates different wording. |
| Activation | A user reaching the first moment of real value in a product. |
| Pull request (PR) | A proposed code change submitted for review before merging. |
| Runbook | A documented procedure for handling a known operational situation. |
| Observability | The ability to understand a system's state from its metrics, logs and traces. |
| Data drift | A change in the distribution of input data compared with what a model was trained on. |
| PSI | Population stability index: a score for how much a distribution has shifted. |
| LLM gateway | A service that routes language-model requests between providers by cost, latency and quality. |
| CDP | Customer data platform: a system that unifies customer data from many sources into profiles. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| OCR / text detection | Finding and reading text in images. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Distribution shift | A change in the data a model sees compared with training. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
