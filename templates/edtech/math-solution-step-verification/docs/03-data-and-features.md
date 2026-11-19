# Math Solution Step Verification: data and feature specification

> Generated from the blueprint `edtech/math-solution-step-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Math Solution Step Verification · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Math Solution Step Verification": Check each step of a student's mathematical working for validity and pinpoint the first error with an explanation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test problems from training distribution.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Step equivalence check | CAS equivalence of consecutive steps | Validity | Parsing |   |   |   |
| Rule-application classifier | which rule was used | Error type | Taxonomy |   |   |   |
| Solution-path similarity | closeness to valid solution paths | Alternative methods | Graph |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Verification | Symbolic engines verify equivalence of steps | LLM judgement of steps | LLMs accept plausible but invalid steps |
| Localisation | First-error localisation | Final-answer match | Right answers can follow flawed reasoning |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Handwriting style | not content |
| Time per step | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Step equivalence check inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: parsing. |
| Rule-application classifier inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: taxonomy. |
| Solution-path similarity inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: graph. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: math_solution_step_verification_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: step_equivalence_check, type: double, nullable: false }
    - { name: rule_application_classifier, type: double, nullable: false }
    - { name: solution_path_similarity, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Step equivalence check and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rule-application classifier against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Step equivalence check, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE math_solution_step_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE math_solution_step_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES math_solution_step_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON math_solution_step_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE math_solution_step_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Math Solution Step Verification": Check each step of a student's mathematical working for validity and pinpoint the first error with an explanation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Step equivalence check | CAS equivalence of consecutive steps. Validity. | Leakage risk to design against: Parsing. |
| A signal-versus-noise trap in this use case: Verification | The true signal is symbolic engines verify equivalence of steps; the common noise is lLM judgement of steps. | LLMs accept plausible but invalid steps. |

**Ask the experts**

- [ ] What exactly does "Formal correctness" mean in practice for math solution step verification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Step equivalence check" and "Rule-application classifier", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Revision rate after feedback" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test problems from training distribution, and who can confirm the cut-off times and splits?
- [ ] How often does "Valid alternative method not in reference" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Rubric | A scoring guide that defines criteria and performance levels for graded work. |
| Inter-rater agreement | How closely two raters, human or automated, agree, often measured with quadratic weighted kappa. |
| Automated essay scoring (AES) | Software that predicts the score a human rater would give an essay. |
| Misconception | A systematic wrong idea a learner holds, which wrong answers can reveal. |
| Learning path | An ordered sequence of content or skills tailored to a learner's goal. |
| Prerequisite graph | A directed graph of which skills must be learned before others. |
| Socratic tutoring | Guiding a learner to the answer with questions and hints instead of telling them. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
