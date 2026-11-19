# Short-Answer Grading with LLMs: data and feature specification

> Generated from the blueprint `edtech/short-answer-grading-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Short-Answer Grading with LLMs · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Short-Answer Grading with LLMs": Grade free-text answers against rubrics with explanations, giving consistent scoring and instant feedback at scale. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rubrics too vague to test.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Rubric-criterion match | per-criterion judgment | Transparency | Rubric design |   |   |   |
| Grader agreement with teachers | kappa per question | Reliability | Sample |   |   |   |
| Self-consistency across samples | agreement over 3 runs | Stability | Sampling |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Rubric | Rubric-conditioned grading with reference answers | Free-form LLM grading | Free-form grading is inconsistent across runs |
| Calibration | Calibrate to human graders per question | Trust model scores | LLMs are lenient on fluent wrong answers |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Answer length | not correctness |
| Student writing style | bias |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Rubric-criterion match inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: rubric design. |
| Grader agreement with teachers inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: sample. |
| Self-consistency across samples inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: sampling. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: short_answer_grading_llm_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: rubric_criterion_match, type: double, nullable: false }
    - { name: grader_agreement_with_teachers, type: double, nullable: false }
    - { name: self_consistency_across_samples, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Rubric-criterion match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Grader agreement with teachers against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Rubric-criterion match, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| ASAP-SAS short answer scoring | https://www.kaggle.com/c/asap-sas | Competition rules; free Kaggle login | Short student answers with human scores for ten prompts | Prompt-specific and small per prompt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| ASAP Automated Student Assessment Prize: essay scoring | https://www.kaggle.com/c/asap-aes | Competition rules; free Kaggle login | Student essays with human scores across eight prompts | Prompt-specific; scores from one era. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE short_answer_grading_llm_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE short_answer_grading_llm_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES short_answer_grading_llm_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON short_answer_grading_llm_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE short_answer_grading_llm_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Short-Answer Grading with LLMs": Grade free-text answers against rubrics with explanations, giving consistent scoring and instant feedback at scale. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Assessment: items, scoring and psychometrics | Tests and quizzes are built from items with known difficulty and discrimination, calibrated with item response theory so scores are comparable across forms. Adaptive tests choose the next question to pin down ability quickly. Automated scoring of essays and short answers must agree with trained human raters and be audited for bias. | Scores affect grades and opportunities, so reliability, fairness and agreement with human scoring are formal requirements, not nice-to-haves. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Rubric-criterion match | Per-criterion judgment. Transparency. | Leakage risk to design against: Rubric design. |
| A signal-versus-noise trap in this use case: Rubric | The true signal is rubric-conditioned grading with reference answers; the common noise is free-form LLM grading. | Free-form grading is inconsistent across runs. |

**Ask the experts**

- [ ] What exactly does "Consistency across runs" mean in practice for short-answer grading with llms: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Rubric-criterion match" and "Grader agreement with teachers", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to feedback" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: rubrics too vague to test, and who can confirm the cut-off times and splits?
- [ ] How often does "Unconventional but correct answers" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Rubric | A scoring guide that defines criteria and performance levels for graded work. |
| Inter-rater agreement | How closely two raters, human or automated, agree, often measured with quadratic weighted kappa. |
| Automated essay scoring (AES) | Software that predicts the score a human rater would give an essay. |
| Socratic tutoring | Guiding a learner to the answer with questions and hints instead of telling them. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Paraphrase robustness | A model giving the same answer to differently worded versions of the same text. |
