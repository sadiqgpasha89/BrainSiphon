# Nonconformance Report Classification: data and feature specification

> Generated from the blueprint `engineering/nonconformance-report-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Nonconformance Report Classification · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Nonconformance Report Classification": Classify nonconformance reports by cause, discipline and severity and find repeating patterns across projects and suppliers so quality managers can fix systemic causes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Initial category as label.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Report text and photos | description of the issue | Core | From the quality system |   |   |   |
| Work package and supplier | where the issue arose | Pattern | From project data |   |   |   |
| Inspection stage | when it was found | Context | From records |   |   |   |
| Closure outcome | cause and corrective action | Label | From closure records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Root causes confirmed in closure | Initial category | Initial categories are often wrong |
| Level | Process, supplier and design | Individual workers | Blame hides real causes |
| Action | Corrective action tracking | Report counts | Counts do not fix causes |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Reporter name | personal data |
| Report number | an identifier |
| Photo count | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Report text and photos inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the quality system. |
| Work package and supplier inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from project data. |
| Inspection stage inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from records. |
| Closure outcome inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from closure records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: nonconformance_report_classification_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: report_text_and_photos, type: double, nullable: false }
    - { name: work_package_and_supplier, type: double, nullable: false }
    - { name: inspection_stage, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Report text and photos and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Work package and supplier against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Report text and photos, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE nonconformance_report_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE nonconformance_report_fields (
  document_id TEXT NOT NULL REFERENCES nonconformance_report_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE nonconformance_report_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Nonconformance Report Classification": Classify nonconformance reports by cause, discipline and severity and find repeating patterns across projects and suppliers so quality managers can fix systemic causes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Site safety is about conditions | Hazards such as open edges, exclusion zones and plant movement can be detected at scene level. Monitoring individual workers raises legal and trust issues. | Safety tools support inspections and do not replace them. |
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Cost grows through change | Cost overruns come from scope change, design maturity, market prices and productivity. Early estimates carry wide uncertainty that narrows as design matures. | Reporting a single number at an early stage hides the range. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Report text and photos | Description of the issue. Core. | Leakage risk to design against: From the quality system. |
| A signal-versus-noise trap in this use case: Label | The true signal is root causes confirmed in closure; the common noise is initial category. | Initial categories are often wrong. |

**Ask the experts**

- [ ] What exactly does "Quality managers confirm classifications" mean in practice for nonconformance report classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Report text and photos" and "Work package and supplier", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Repeat nonconformances" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: initial category as label, and who can confirm the cut-off times and splits?
- [ ] How often does "Free-text vagueness" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Non-conformance | Work that does not meet requirements. |
| RFI | Request for information: a question sent to the design team during construction. |
| Change order | A formal change to scope, cost or time. |
| Subcontractor | A firm hired by the main contractor for part of the work. |
| Work package | A defined portion of the project work. |
| Claim | A request for extra time or money under a contract. |
| Health and safety plan | A plan for managing risk on a project. |
| Engineer of record | The licensed engineer responsible for a design. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| F1 score | The harmonic mean of precision and recall. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Distribution shift | A change in the data a model sees compared with training. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
