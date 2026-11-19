# Handwritten Exam OCR & Grading Assistance: data and feature specification

> Generated from the blueprint `edtech/handwritten-exam-ocr-grading` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Handwritten Exam OCR & Grading Assistance · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Handwritten Exam OCR & Grading Assistance": Digitise handwritten exam scripts and assist graders by locating answers, reading text and pre-scoring objective parts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test handwriting from few writers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Region-to-question mapping | layout model confidence | Correct association | Template |   |   |   |
| OCR confidence per word | calibrated confidence | Review routing | Calibration |   |   |   |
| Pre-score agreement | auto-score vs grader | Quality | Sample |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Review | Show OCR with confidence so graders verify | Silent auto-grading | OCR errors change marks |
| Layout | Answer-region detection and question mapping | Full-page OCR | Layout errors assign answers to wrong questions |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Paper colour | scan |
| Pen colour | scan |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Region-to-question mapping inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: template. |
| OCR confidence per word inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibration. |
| Pre-score agreement inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: sample. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: handwritten_exam_ocr_grading_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: region_to_question_mapping, type: double, nullable: false }
    - { name: ocr_confidence_per_word, type: double, nullable: false }
    - { name: pre_score_agreement, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Region-to-question mapping and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for OCR confidence per word against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Region-to-question mapping, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- frames stay in object storage; the database holds pointers and results
CREATE TABLE handwritten_exam_ocr_grading_frames (
  frame_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, uri TEXT NOT NULL,
  width INT NOT NULL, height INT NOT NULL, sha256 TEXT NOT NULL, retention_until DATE NOT NULL
) ;

CREATE TABLE handwritten_exam_ocr_grading_detections (
  frame_id TEXT NOT NULL REFERENCES handwritten_exam_ocr_grading_frames, det_no SMALLINT NOT NULL, class TEXT NOT NULL,
  bbox REAL[4] NOT NULL, score REAL NOT NULL, track_id INT, model_version TEXT NOT NULL,
  PRIMARY KEY (frame_id, det_no)
);

-- human review labels feed hard-example mining and drift checks
CREATE TABLE handwritten_exam_ocr_grading_reviews (
  frame_id TEXT NOT NULL, det_no SMALLINT, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, corrected_class TEXT, reviewed_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Handwritten Exam OCR & Grading Assistance": Digitise handwritten exam scripts and assist graders by locating answers, reading text and pre-scoring objective parts. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| Academic integrity, proctoring and privacy | Plagiarism and cheating detection compare code and text, and proctoring uses video and behaviour signals. These systems can wrongly accuse students and raise privacy concerns, especially for minors and remote exams. | The cost of a false accusation is high, so outputs support a human decision and need appeal paths. |
| Labels, annotators and ground truth in images | Image labels come from expert reads, reports or biopsies and carry noise; annotators disagree, and the boundary of a lesion or defect is a judgment. Class imbalance is extreme: most images are normal. | Measure inter-reader agreement, adjudicate disagreements and report performance against the quality of ground truth, not just a single label. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Region-to-question mapping | Layout model confidence. Correct association. | Leakage risk to design against: Template. |
| A signal-versus-noise trap in this use case: Review | The true signal is show OCR with confidence so graders verify; the common noise is silent auto-grading. | OCR errors change marks. |

**Ask the experts**

- [ ] What exactly does "Handwriting diversity" mean in practice for handwritten exam ocr & grading assistance: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Region-to-question mapping" and "OCR confidence per word", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Grading turnaround" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test handwriting from few writers, and who can confirm the cut-off times and splits?
- [ ] How often does "Cross-outs and overwrites" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Inter-rater agreement | How closely two raters, human or automated, agree, often measured with quadratic weighted kappa. |
| Rubric | A scoring guide that defines criteria and performance levels for graded work. |
| Automated essay scoring (AES) | Software that predicts the score a human rater would give an essay. |
| Proctoring | Monitoring an exam, in person or remotely, to prevent cheating. |
| Timetabling | Assigning courses, exams and rooms to time slots without clashes. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Viva voce | An oral examination in which a student answers questions from examiners. |
| OCR / text detection | Finding and reading text in images. |
| mAP | Mean average precision: a detection score averaged over classes and overlap thresholds. |
| Convolutional network (CNN) | A neural network that learns local image filters shared across the image. |
| Vision transformer | An image model that splits an image into patches and processes them with attention. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
