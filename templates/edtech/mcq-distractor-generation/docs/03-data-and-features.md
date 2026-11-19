# MCQ Distractor Generation: data and feature specification

> Generated from the blueprint `edtech/mcq-distractor-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** MCQ Distractor Generation · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "MCQ Distractor Generation": Produce plausible but incorrect options that reflect common misconceptions to make multiple-choice items diagnostic. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating by fluency.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Misconception tag | taxonomy mapping | Diagnostic value | Labelling |   |   |   |
| Option selection rate | observed rate on pilots | Quality | Pilot data |   |   |   |
| Ambiguity check | solver finds multiple correct | Validity | Solver |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Diagnosis | Distractors map to specific misconceptions | Random wrong answers | Plausible distractors reveal thinking errors |
| Validity | Ensure only one correct option | Fluent distractors | Accidentally correct distractors invalidate items |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Option length | cue |
| Position of correct option | bias |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Misconception tag inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: labelling. |
| Option selection rate inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: pilot data. |
| Ambiguity check inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: solver. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: mcq_distractor_generation_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: misconception_tag, type: double, nullable: false }
    - { name: option_selection_rate, type: double, nullable: false }
    - { name: ambiguity_check, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Misconception tag and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Option selection rate against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Misconception tag, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE mcq_distractor_generation_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE mcq_distractor_generation_fields (
  document_id TEXT NOT NULL REFERENCES mcq_distractor_generation_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE mcq_distractor_generation_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "MCQ Distractor Generation": Produce plausible but incorrect options that reflect common misconceptions to make multiple-choice items diagnostic. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Misconception tag | Taxonomy mapping. Diagnostic value. | Leakage risk to design against: Labelling. |
| A signal-versus-noise trap in this use case: Diagnosis | The true signal is distractors map to specific misconceptions; the common noise is random wrong answers. | Plausible distractors reveal thinking errors. |

**Ask the experts**

- [ ] What exactly does "Distractors must be wrong but plausible" mean in practice for mcq distractor generation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Misconception tag" and "Option selection rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Item discrimination index" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating by fluency, and who can confirm the cut-off times and splits?
- [ ] How often does "Distractor is arguably correct" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Distractor | A plausible wrong answer in a multiple-choice question, ideally reflecting a common misconception. |
| Misconception | A systematic wrong idea a learner holds, which wrong answers can reveal. |
| Socratic tutoring | Guiding a learner to the answer with questions and hints instead of telling them. |
| Item | One question or exercise a learner can answer. |
| Guess / slip | The chance of answering correctly without mastery (guess) or incorrectly despite mastery (slip). |
| Difficulty / discrimination | How hard an item is, and how sharply it separates stronger from weaker learners. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| Formative feedback | Comments that help a learner improve while they are still learning. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
