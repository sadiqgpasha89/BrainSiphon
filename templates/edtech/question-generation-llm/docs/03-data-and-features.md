# Question Generation with LLMs: data and feature specification

> Generated from the blueprint `edtech/question-generation-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Question Generation with LLMs · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Question Generation with LLMs": Generate curriculum-aligned questions with correct answers, plausible distractors and difficulty tags for teacher review. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating without a solver check.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Independent solve agreement | solver matches key | Correctness | Solver quality |   |   |   |
| Objective-match score | classifier alignment to objective | Alignment | Taxonomy |   |   |   |
| Distractor plausibility | model-estimated selection rate | Quality | Calibration |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Verification | Solve generated questions independently to check answers | Trust generated keys | Generated answer keys are wrong 5-15% of the time |
| Alignment | Retrieval from approved materials | Open-world generation | Ungrounded questions test content not taught |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Question length | weak |
| Style | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Independent solve agreement inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: solver quality. |
| Objective-match score inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: taxonomy. |
| Distractor plausibility inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: calibration. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: question_generation_llm_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: independent_solve_agreement, type: double, nullable: false }
    - { name: objective_match_score, type: double, nullable: false }
    - { name: distractor_plausibility, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Independent solve agreement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Objective-match score against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Independent solve agreement, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
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
CREATE TABLE question_generation_llm_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE question_generation_llm_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES question_generation_llm_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON question_generation_llm_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE question_generation_llm_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Question Generation with LLMs": Generate curriculum-aligned questions with correct answers, plausible distractors and difficulty tags for teacher review. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Item difficulty and ability: IRT | Item response theory describes the chance of a correct answer as a function of a learner's ability and the item's difficulty (and sometimes discrimination and guessing). The same learner is less likely to answer a hard item correctly. | Predictions must account for how hard the next question is, and difficulty should be learned from other students. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Independent solve agreement | Solver matches key. Correctness. | Leakage risk to design against: Solver quality. |
| A signal-versus-noise trap in this use case: Verification | The true signal is solve generated questions independently to check answers; the common noise is trust generated keys. | Generated answer keys are wrong 5-15% of the time. |

**Ask the experts**

- [ ] What exactly does "Factual correctness" mean in practice for question generation with llms: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Independent solve agreement" and "Objective-match score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Teacher time saved" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating without a solver check, and who can confirm the cut-off times and splits?
- [ ] How often does "Wrong answer key accepted" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Distractor | A plausible wrong answer in a multiple-choice question, ideally reflecting a common misconception. |
| Item response theory (IRT) | A family of models relating the chance of a correct answer to a learner's ability and an item's parameters. |
| Curriculum standard | A published statement of what learners should know, such as a national standard, to which content is tagged. |
| Peer learning | Students learning together in groups, where group composition affects outcomes. |
| Item | One question or exercise a learner can answer. |
| Difficulty / discrimination | How hard an item is, and how sharply it separates stronger from weaker learners. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Inter-rater agreement | How closely two raters, human or automated, agree, often measured with quadratic weighted kappa. |
| Misconception | A systematic wrong idea a learner holds, which wrong answers can reveal. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
