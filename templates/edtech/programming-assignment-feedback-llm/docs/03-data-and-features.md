# Programming Assignment Feedback: data and feature specification

> Generated from the blueprint `edtech/programming-assignment-feedback-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Programming Assignment Feedback · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Programming Assignment Feedback": Give students hints and explanations on code submissions that guide learning without revealing full solutions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating hints on correctness alone.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Failing test signature | which tests fail and how | Diagnosis | Test design |   |   |   |
| Misconception classifier | common error pattern match | Targeted hint | Taxonomy |   |   |   |
| Solution-leak score | similarity of hint to reference solution | Policy | Check |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Hints | Graduated hints tied to failing tests and misconceptions | Rewriting the student's code | Rewriting robs the learning moment |
| Verification | Run tests in a sandbox and ground hints on failures | LLM reasoning alone | LLMs misjudge program behaviour |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Code style only | not correctness |
| Variable names | noise |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Failing test signature inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: test design. |
| Misconception classifier inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: taxonomy. |
| Solution-leak score inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: check. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: programming_assignment_feedback_llm_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: failing_test_signature, type: double, nullable: false }
    - { name: misconception_classifier, type: double, nullable: false }
    - { name: solution_leak_score, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Failing test signature and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Misconception classifier against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Failing test signature, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE programming_assignment_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE programming_assignment_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES programming_assignment_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON programming_assignment_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE programming_assignment_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Programming Assignment Feedback": Give students hints and explanations on code submissions that guide learning without revealing full solutions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Academic integrity, proctoring and privacy | Plagiarism and cheating detection compare code and text, and proctoring uses video and behaviour signals. These systems can wrongly accuse students and raise privacy concerns, especially for minors and remote exams. | The cost of a false accusation is high, so outputs support a human decision and need appeal paths. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Failing test signature | Which tests fail and how. Diagnosis. | Leakage risk to design against: Test design. |
| A signal-versus-noise trap in this use case: Hints | The true signal is graduated hints tied to failing tests and misconceptions; the common noise is rewriting the student's code. | Rewriting robs the learning moment. |

**Ask the experts**

- [ ] What exactly does "Do not give the full solution" mean in practice for programming assignment feedback: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Failing test signature" and "Misconception classifier", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Resubmission success rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating hints on correctness alone, and who can confirm the cut-off times and splits?
- [ ] How often does "Student code tries to escape the sandbox" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Formative feedback | Comments that help a learner improve while they are still learning. |
| Misconception | A systematic wrong idea a learner holds, which wrong answers can reveal. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| Code plagiarism | Submitting another's program, often disguised by renaming variables or reordering code. |
| Distractor | A plausible wrong answer in a multiple-choice question, ideally reflecting a common misconception. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Abstention | Declining to answer because the evidence is missing. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
