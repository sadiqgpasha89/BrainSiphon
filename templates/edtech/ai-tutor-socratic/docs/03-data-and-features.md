# Socratic AI Tutor: data and feature specification

> Generated from the blueprint `edtech/ai-tutor-socratic` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Socratic AI Tutor · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Socratic AI Tutor": Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judging tutor on helpfulness ratings.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Student mastery estimate | KT mastery state | Adapts difficulty | Calibration |   |   |   |
| Hint-ladder state | hint level used | Scaffold | Dialogue state |   |   |   |
| Answer-leak rate | fraction of turns revealing answers early | Pedagogy | Check |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Pedagogy | Scaffolded questioning and misconception handling | Answer-giving chatbot | Handing over answers short-circuits learning |
| Correctness | Verify maths and facts with tools | LLM arithmetic and recall | Tutors that confidently teach wrong content harm learners |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Chat length | not learning |
| Student sentiment alone | not learning |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Student mastery estimate inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibration. |
| Hint-ladder state inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: dialogue state. |
| Answer-leak rate inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: check. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: ai_tutor_socratic_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: student_mastery_estimate, type: double, nullable: false }
    - { name: hint_ladder_state, type: double, nullable: false }
    - { name: answer_leak_rate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Student mastery estimate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Hint-ladder state against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Student mastery estimate, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE ai_tutor_socratic_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE ai_tutor_socratic_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES ai_tutor_socratic_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON ai_tutor_socratic_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE ai_tutor_socratic_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Socratic AI Tutor": Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Student mastery estimate | KT mastery state. Adapts difficulty. | Leakage risk to design against: Calibration. |
| A signal-versus-noise trap in this use case: Pedagogy | The true signal is scaffolded questioning and misconception handling; the common noise is answer-giving chatbot. | Handing over answers short-circuits learning. |

**Ask the experts**

- [ ] What exactly does "Age-appropriate safety" mean in practice for socratic ai tutor: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Student mastery estimate" and "Hint-ladder state", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Learning gain vs control" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: judging tutor on helpfulness ratings, and who can confirm the cut-off times and splits?
- [ ] How often does "Student pastes homework to get the answer" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Socratic tutoring | Guiding a learner to the answer with questions and hints instead of telling them. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Misconception | A systematic wrong idea a learner holds, which wrong answers can reveal. |
| Difficulty / discrimination | How hard an item is, and how sharply it separates stronger from weaker learners. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Item response theory (IRT) | A family of models relating the chance of a correct answer to a learner's ability and an item's parameters. |
| Distractor | A plausible wrong answer in a multiple-choice question, ideally reflecting a common misconception. |
| Curriculum standard | A published statement of what learners should know, such as a national standard, to which content is tagged. |
| Formative feedback | Comments that help a learner improve while they are still learning. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Abstention | Declining to answer because the evidence is missing. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
