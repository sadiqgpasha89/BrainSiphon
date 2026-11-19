# Multilingual Lecture Captioning & Translation: data and feature specification

> Generated from the blueprint `edtech/multilingual-lecture-captioning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Multilingual Lecture Captioning & Translation · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Multilingual Lecture Captioning & Translation": Provide accurate live and recorded captions and translations for lectures in many languages with technical vocabulary. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test set lacks code-switching.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Contextual biasing list | slide text and glossary | Term accuracy | Extraction |   |   |   |
| Word confidence | calibrated confidence | Highlight uncertain | Calibration |   |   |   |
| Translation quality estimate | QE score | Review routing | Model |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Domain | Course glossary biasing | Generic ASR | Technical terms are rare words |
| Latency | Streaming with revision policy | Full-file ASR only | Live captions need low latency with minimal flicker |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Speaker volume | channel |
| Room reverberation | channel |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Contextual biasing list inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: extraction. |
| Word confidence inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibration. |
| Translation quality estimate inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: model. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: multilingual_lecture_captioning_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: contextual_biasing_list, type: double, nullable: false }
    - { name: word_confidence, type: double, nullable: false }
    - { name: translation_quality_estimate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Contextual biasing list and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Word confidence against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Contextual biasing list, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Mozilla Common Voice | https://commonvoice.mozilla.org/en/datasets | CC0 (see the page) | Crowd-sourced speech recordings with transcripts in many languages | Read speech; accents and noise vary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE multilingual_lecture_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE multilingual_lecture_fields (
  document_id TEXT NOT NULL REFERENCES multilingual_lecture_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE multilingual_lecture_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Multilingual Lecture Captioning & Translation": Provide accurate live and recorded captions and translations for lectures in many languages with technical vocabulary. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Language, speech and reading | Language learning and literacy tools assess pronunciation, reading fluency and conversation using speech recognition and language models. Accents, age and background noise affect accuracy, and feedback must be pedagogically sound, not just correct. | Speech models evaluated on adult native speakers can fail for children and learners, so test on the real population. |
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Contextual biasing list | Slide text and glossary. Term accuracy. | Leakage risk to design against: Extraction. |
| A signal-versus-noise trap in this use case: Domain | The true signal is course glossary biasing; the common noise is generic ASR. | Technical terms are rare words. |

**Ask the experts**

- [ ] What exactly does "Live latency under 3 s" mean in practice for multilingual lecture captioning & translation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Contextual biasing list" and "Word confidence", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Caption accuracy complaints" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test set lacks code-switching, and who can confirm the cut-off times and splits?
- [ ] How often does "Code-switching between two languages" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Word error rate (WER) | Errors in recognised text divided by the number of words in the reference. |
| Accessibility | Making content usable by people with disabilities, for example with alt text and captions. |
| Alt text | A text description of an image for people who cannot see it. |
| CEFR | The European scale of language proficiency from A1 to C2. |
| Item response theory (IRT) | A family of models relating the chance of a correct answer to a learner's ability and an item's parameters. |
| Misconception | A systematic wrong idea a learner holds, which wrong answers can reveal. |
| Curriculum standard | A published statement of what learners should know, such as a national standard, to which content is tagged. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| Formative feedback | Comments that help a learner improve while they are still learning. |
| Pronunciation assessment | Scoring how closely spoken sounds match a target pronunciation. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
