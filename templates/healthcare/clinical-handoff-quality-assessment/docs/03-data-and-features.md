# Clinical Handoff Quality Assessment: data and feature specification

> Generated from the blueprint `healthcare/clinical-handoff-quality-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Handoff Quality Assessment · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Clinical Handoff Quality Assessment": Check whether handoff records contain the structured elements an approved checklist requires and are internally consistent, and give the reviewer a completeness checklist with missing-field flags, contradictions and exact source text. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Letting the model grade quality.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Element presence | whether each required checklist element appears | Primary completeness signal | Extracted fields |   |   |   |
| Structured-versus-narrative consistency | agreement of narrative statements with structured observations | Finds contradictions | Record snapshot |   |   |   |
| Extraction confidence | calibrated confidence for each extracted field | Routes uncertain items to review | Held-out notes |   |   |   |
| Handoff context | unit, shift and patient acuity from workflow data | Selects the right checklist | Workflow records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Checklist | Approved elements checked by rule | Model opinion of quality | Quality means the required elements are present |
| Extraction | Fields extracted with source quotes | Summary of the note | Reviewers must see the original words |
| Contradiction | Flagged as a prompt for review | Declared error | The model can misread context |
| Authority | Clinician validates | Auto-finalised note | Clinical documentation is a clinician's act |
| Scope | Read-only | Writes into the record | Quality review must not alter care records |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Note length | not quality |
| Author writing style | not completeness |
| Time of entry | process artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Element presence inputs | Clinical operations | Electronic health record handoff tool | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: extracted fields. |
| Structured-versus-narrative consistency inputs | Nursing leadership | Approved handoff checklist | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: record snapshot. |
| Extraction confidence inputs | Clinical informatics | Structured observation records | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: held-out notes. |
| Handoff context inputs | Patient safety | Workflow context | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: workflow records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: clinical_handoff_quality_assessment_inputs.v1
owner: clinical-operations@example.com
system_of_record: Electronic health record handoff tool
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: element_presence, type: double, nullable: false }
    - { name: structured_versus_narrative_consistency, type: double, nullable: false }
    - { name: extraction_confidence, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.9%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.9% of required fields populated<br>**Check:** Null-rate assertion on Element presence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values reconciled to the system of record daily<br>**Check:** Reconcile aggregates for Structured-versus-narrative consistency against Electronic health record handoff tool
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Element presence, traces back to Electronic health record handoff tool; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE clinical_handoff_quality_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE clinical_handoff_quality_fields (
  document_id TEXT NOT NULL REFERENCES clinical_handoff_quality_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE clinical_handoff_quality_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Sepsis is a life-threatening organ dysfunction caused by the body's response to an infection, and every hour of delay in treatment matters. An early-warning model sits inside the electronic health record and tries to alert a nurse or physician hours before a patient deteriorates. The hard parts are clinical, not statistical: what counts as onset, which timestamp in the chart is real, and how many alerts a ward will tolerate before it stops reading them. For this use case, "Clinical Handoff Quality Assessment": Check whether handoff records contain the structured elements an approved checklist requires and are internally consistent, and give the reviewer a completeness checklist with missing-field flags, contradictions and exact source text. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Clinical data: what the record really contains | The electronic health record holds structured data (vitals, labs, medications, orders, diagnosis codes) and free text (notes, reports). Timestamps differ for ordering, collection and result; documentation is written after the fact; billing codes reflect reimbursement as much as truth; missingness is informative because tests are ordered when clinicians are worried. | Features and labels built from the record encode clinical behaviour, so leakage and bias are the default, not the exception. |
| Patient-facing language models and safety | Chatbots, symptom checkers and message triage talk to people in distress. Errors range from unhelpful to dangerous, so systems need escalation rules, clinician oversight and strict limits on what they may advise. | Safety evaluation is a red-team exercise with adversarial and crisis scenarios, not a fluency score. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Element presence | Whether each required checklist element appears. Primary completeness signal. | Leakage risk to design against: Extracted fields. |
| A signal-versus-noise trap in this use case: Checklist | The true signal is approved elements checked by rule; the common noise is model opinion of quality. | Quality means the required elements are present. |

**Ask the experts**

- [ ] What exactly does "The clinician validates the content and the tool never makes a clinical decision or finalises a note" mean in practice for clinical handoff quality assessment: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Element presence" and "Structured-versus-narrative consistency", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Handoffs meeting the checklist" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: letting the model grade quality, and who can confirm the cut-off times and splits?
- [ ] How often does "Abbreviation-heavy note" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Ambient scribe | A system that listens to a visit and drafts the clinical note for the clinician to review. |
| Clinical decision support | Software that gives clinicians patient-specific recommendations or alerts at the point of care. |
| Patient-day | One patient present for one day, the denominator for alert burden such as alerts per 100 patient-days. |
| Triage | Sorting patients by urgency to decide who is seen first. |
| Radiology report | The radiologist's written interpretation of an image, a common source of labels. |
| PHI | Protected health information: any health data that can identify a patient. |
| De-identification | Removing or masking identifiers from health data so it can be used for research. |
| Cohort | A defined group of patients used for a study or for matching to trials. |
| Care management | Programmes that give extra support to high-risk patients, which risk models are used to target. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| F1 score | The harmonic mean of precision and recall. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
