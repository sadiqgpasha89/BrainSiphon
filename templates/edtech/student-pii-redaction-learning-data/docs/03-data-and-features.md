# Student PII Redaction in Learning Data: data and feature specification

> Generated from the blueprint `edtech/student-pii-redaction-learning-data` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Student PII Redaction in Learning Data · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Student PII Redaction in Learning Data": Remove or pseudonymise student PII in submissions, chats and transcripts before using them for analytics or model training. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation on synthetic names.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| NER entity probabilities | token confidence | Recall tuning | Calibration |   |   |   |
| Student roster match | names from the class roster | High-precision catch | Roster freshness |   |   |   |
| Contextual identifiers | school, teacher and location mentions | Re-identification | Rules |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Recall | Recall-first redaction with rule backstops | Balanced F1 | A missed name is a privacy breach |
| Utility | Consistent pseudonyms | Replacing with tags | Consistency preserves analytic value |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Text length | weak |
| Language | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| NER entity probabilities inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibration. |
| Student roster match inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: roster freshness. |
| Contextual identifiers inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: rules. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: student_pii_redaction_learning_data_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: ner_entity_probabilities, type: double, nullable: false }
    - { name: student_roster_match, type: double, nullable: false }
    - { name: contextual_identifiers, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on NER entity probabilities and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Student roster match against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as NER entity probabilities, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE student_pii_redaction_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE student_pii_redaction_fields (
  document_id TEXT NOT NULL REFERENCES student_pii_redaction_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE student_pii_redaction_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Student PII Redaction in Learning Data": Remove or pseudonymise student PII in submissions, chats and transcripts before using them for analytics or model training. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| Language, speech and reading | Language learning and literacy tools assess pronunciation, reading fluency and conversation using speech recognition and language models. Accents, age and background noise affect accuracy, and feedback must be pedagogically sound, not just correct. | Speech models evaluated on adult native speakers can fail for children and learners, so test on the real population. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: NER entity probabilities | Token confidence. Recall tuning. | Leakage risk to design against: Calibration. |
| A signal-versus-noise trap in this use case: Recall | The true signal is recall-first redaction with rule backstops; the common noise is balanced F1. | A missed name is a privacy breach. |

**Ask the experts**

- [ ] What exactly does "FERPA / GDPR compliance" mean in practice for student pii redaction in learning data: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "NER entity probabilities" and "Student roster match", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "PII leaks in audits" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluation on synthetic names, and who can confirm the cut-off times and splits?
- [ ] How often does "Common-word names (Rose, Hope)" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Peer learning | Students learning together in groups, where group composition affects outcomes. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
