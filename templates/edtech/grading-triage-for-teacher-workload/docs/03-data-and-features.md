# Grading Triage & Teacher Workload Optimisation: data and feature specification

> Generated from the blueprint `edtech/grading-triage-for-teacher-workload` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Grading Triage & Teacher Workload Optimisation · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Grading Triage & Teacher Workload Optimisation": Prioritise which student work teachers should grade manually and which can be auto-graded or sampled, reducing workload without hurting quality. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on easy items.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Grader confidence | calibrated confidence | Routing | Calibration |   |   |   |
| Item type risk | stakes of the assessment | Policy | Metadata |   |   |   |
| Disagreement across graders | ensemble disagreement | Flag | Models |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Triage | Confidence-based routing with audited samples | Auto-grade everything | Unchecked errors compound |
| Audit | Random audits of auto-graded items | Trust model confidence | Confidence drifts silently |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Student name | bias |
| Submission time | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Grader confidence inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibration. |
| Item type risk inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: metadata. |
| Disagreement across graders inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: models. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: grading_triage_for_teacher_workload_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: grader_confidence, type: double, nullable: false }
    - { name: item_type_risk, type: double, nullable: false }
    - { name: disagreement_across_graders, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Grader confidence and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Item type risk against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Grader confidence, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| ASAP Automated Student Assessment Prize: essay scoring | https://www.kaggle.com/c/asap-aes | Competition rules; free Kaggle login | Student essays with human scores across eight prompts | Prompt-specific; scores from one era. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ASAP-SAS short answer scoring | https://www.kaggle.com/c/asap-sas | Competition rules; free Kaggle login | Short student answers with human scores for ten prompts | Prompt-specific and small per prompt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE grading_triage_for_teacher_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE grading_triage_for_teacher_fields (
  document_id TEXT NOT NULL REFERENCES grading_triage_for_teacher_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE grading_triage_for_teacher_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Grading Triage & Teacher Workload Optimisation": Prioritise which student work teachers should grade manually and which can be auto-graded or sampled, reducing workload without hurting quality. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Grader confidence | Calibrated confidence. Routing. | Leakage risk to design against: Calibration. |
| A signal-versus-noise trap in this use case: Triage | The true signal is confidence-based routing with audited samples; the common noise is auto-grade everything. | Unchecked errors compound. |

**Ask the experts**

- [ ] What exactly does "Quality assurance sampling" mean in practice for grading triage & teacher workload optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Grader confidence" and "Item type risk", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Teacher hours saved" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on easy items, and who can confirm the cut-off times and splits?
- [ ] How often does "Model drifts on new question types" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Rubric | A scoring guide that defines criteria and performance levels for graded work. |
| Inter-rater agreement | How closely two raters, human or automated, agree, often measured with quadratic weighted kappa. |
| Automated essay scoring (AES) | Software that predicts the score a human rater would give an essay. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Item response theory (IRT) | A family of models relating the chance of a correct answer to a learner's ability and an item's parameters. |
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Viva voce | An oral examination in which a student answers questions from examiners. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Log loss | The negative log-likelihood of the observed labels; punishes confident mistakes. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Distribution shift | A change in the data a model sees compared with training. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
