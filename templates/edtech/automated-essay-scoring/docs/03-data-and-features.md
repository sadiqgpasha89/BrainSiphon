# Automated Essay Scoring: data and feature specification

> Generated from the blueprint `edtech/automated-essay-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Essay Scoring · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Automated Essay Scoring": Score essays against rubrics with human-level agreement and give actionable feedback, with transparency and fairness. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on single-rater scores.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Rubric trait scores | multi-head trait predictions | Feedback | Annotated rubric |   |   |   |
| Discourse coherence features | coherence model score | Organisation | Parser quality |   |   |   |
| Prompt relevance | semantic match to the prompt | Off-topic detection | Embeddings |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Traits | Trait-level scoring (organisation, evidence, language) | Single holistic score | Students and teachers need diagnostic feedback |
| Robustness | Test against adversarial and off-topic essays | Agreement on typical essays | Models reward length and big words |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Essay length alone | gameable |
| Rare word counts | gameable |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Rubric trait scores inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: annotated rubric. |
| Discourse coherence features inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: parser quality. |
| Prompt relevance inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: embeddings. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: automated_essay_scoring_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: rubric_trait_scores, type: double, nullable: false }
    - { name: discourse_coherence_features, type: double, nullable: false }
    - { name: prompt_relevance, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Rubric trait scores and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Discourse coherence features against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Rubric trait scores, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| ASAP Automated Student Assessment Prize: essay scoring | https://www.kaggle.com/c/asap-aes | Competition rules; free Kaggle login | Student essays with human scores across eight prompts | Prompt-specific; scores from one era. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ASAP-SAS short answer scoring | https://www.kaggle.com/c/asap-sas | Competition rules; free Kaggle login | Short student answers with human scores for ten prompts | Prompt-specific and small per prompt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE automated_essay_scoring_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE automated_essay_scoring_fields (
  document_id TEXT NOT NULL REFERENCES automated_essay_scoring_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE automated_essay_scoring_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Automated Essay Scoring": Score essays against rubrics with human-level agreement and give actionable feedback, with transparency and fairness. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| Language, speech and reading | Language learning and literacy tools assess pronunciation, reading fluency and conversation using speech recognition and language models. Accents, age and background noise affect accuracy, and feedback must be pedagogically sound, not just correct. | Speech models evaluated on adult native speakers can fail for children and learners, so test on the real population. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Rubric trait scores | Multi-head trait predictions. Feedback. | Leakage risk to design against: Annotated rubric. |
| A signal-versus-noise trap in this use case: Traits | The true signal is trait-level scoring (organisation, evidence, language); the common noise is single holistic score. | Students and teachers need diagnostic feedback. |

**Ask the experts**

- [ ] What exactly does "Agreement with expert raters (QWK)" mean in practice for automated essay scoring: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Rubric trait scores" and "Discourse coherence features", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Teacher time saved" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on single-rater scores, and who can confirm the cut-off times and splits?
- [ ] How often does "Essay topics change between years" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Inter-rater agreement | How closely two raters, human or automated, agree, often measured with quadratic weighted kappa. |
| Rubric | A scoring guide that defines criteria and performance levels for graded work. |
| Automated essay scoring (AES) | Software that predicts the score a human rater would give an essay. |
| Admissions | The process of selecting applicants for a programme, subject to fairness and legal rules. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| CEFR | The European scale of language proficiency from A1 to C2. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Distribution shift | A change in the data a model sees compared with training. |
