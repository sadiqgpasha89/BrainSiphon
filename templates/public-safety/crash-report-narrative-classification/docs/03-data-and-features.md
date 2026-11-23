# Crash Report Narrative Classification: data and feature specification

> Generated from the blueprint `public-safety/crash-report-narrative-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Crash Report Narrative Classification · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Crash Report Narrative Classification": Classify crash report narratives into contributing factors and scenarios so engineers and policy teams study causes beyond the coded fields. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Checkbox-only labels.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Narrative text | description of the crash | Factors | From the report |   |   |   |
| Coded fields | road, weather and vehicle types | Context | From the form |   |   |   |
| Location context | junction type and speed limit | Context | From GIS |   |   |   |
| Severity | injury level | Priority | From the report |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Factors coded by trained analysts | Officer checkboxes | Checkboxes are inconsistent |
| Privacy | Redacted narratives | Named narratives | Names add risk without value |
| Use | Pattern analysis for engineers | Blame assignment | The goal is system safety |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Officer name | irrelevant |
| Driver name | personal data |
| Report length | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Narrative text inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the report. |
| Coded fields inputs | Operations and investigations leadership | Records management and evidence systems | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the form. |
| Location context inputs | Chief data and ethics officer | Court case management | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from GIS. |
| Severity inputs | Emergency communications | Computer-aided dispatch (CAD) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the report. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: crash_report_narrative_classification_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: narrative_text, type: double, nullable: false }
    - { name: coded_fields, type: double, nullable: false }
    - { name: location_context, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Narrative text and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Coded fields against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Narrative text, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE crash_report_narrative_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE crash_report_narrative_fields (
  document_id TEXT NOT NULL REFERENCES crash_report_narrative_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE crash_report_narrative_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Crash Report Narrative Classification": Classify crash report narratives into contributing factors and scenarios so engineers and policy teams study causes beyond the coded fields. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Road safety depends on exposure and context | Crash risk depends on road design, speed, traffic, weather and user mix, and crashes are rare events. Analysis works at the location and segment level and avoids singling out drivers. | Targeting individuals from location history raises privacy and fairness concerns. |
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Records are sensitive and need strict retention | Incident, victim and witness records are among the most sensitive data a state holds. Access is logged, retention limits are enforced and data is shared only as the law allows. | Aggregated and de-identified data should be used for analytics wherever possible. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Narrative text | Description of the crash. Factors. | Leakage risk to design against: From the report. |
| A signal-versus-noise trap in this use case: Label | The true signal is factors coded by trained analysts; the common noise is officer checkboxes. | Checkboxes are inconsistent. |

**Ask the experts**

- [ ] What exactly does "Multi-label factors with confidence" mean in practice for crash report narrative classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Narrative text" and "Coded fields", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to study a pattern" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: checkbox-only labels, and who can confirm the cut-off times and splits?
- [ ] How often does "Vague narrative" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Crash hotspot | A location with many crashes. |
| Black spot | A road location with a high crash record. |
| Near miss | An event that almost caused a crash. |
| Unit | A vehicle or team available for dispatch. |
| Vision Zero | A strategy to eliminate road deaths and serious injuries. |
| Speed management | Setting and enforcing speeds to cut harm. |
| Redaction | Removing sensitive text from a document. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
