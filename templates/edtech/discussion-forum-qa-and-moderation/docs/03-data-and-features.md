# Discussion Forum Q&A & Moderation: data and feature specification

> Generated from the blueprint `edtech/discussion-forum-qa-and-moderation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Discussion Forum Q&A & Moderation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Discussion Forum Q&A & Moderation": Auto-answer repeated questions with citations, surface expert answers, and moderate toxic or off-topic posts. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on toxic data from other domains.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Question similarity | embedding similarity to past questions | Dedup | Domain tuning |   |   |   |
| Answer quality votes and instructor tags | endorsements | Trust | Vote bias |   |   |   |
| Toxicity probability | classifier score | Moderation | Calibration |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Duplicates | Semantic duplicate detection with linked answers | Keyword search | Duplicates phrase the same doubt differently |
| Moderation | Contextual toxicity (not word lists) | Profanity filters | Learners discuss sensitive topics legitimately |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Post length | weak |
| Poster name | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Question similarity inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: domain tuning. |
| Answer quality votes and instructor tags inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: vote bias. |
| Toxicity probability inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibration. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: discussion_forum_qa_and_moderation_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: question_similarity, type: double, nullable: false }
    - { name: answer_quality_votes_and_instructor_tags, type: double, nullable: false }
    - { name: toxicity_probability, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Question similarity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Answer quality votes and instructor tags against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Question similarity, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| CodeSearchNet | https://github.com/github/CodeSearchNet | MIT licence plus per-project licences (see the repository) | About 2 million functions with natural-language documentation in six languages | Docstrings are not user queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE discussion_forum_qa_and_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE discussion_forum_qa_and_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES discussion_forum_qa_and_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON discussion_forum_qa_and_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE discussion_forum_qa_and_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Discussion Forum Q&A & Moderation": Auto-answer repeated questions with citations, surface expert answers, and moderate toxic or off-topic posts. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Question similarity | Embedding similarity to past questions. Dedup. | Leakage risk to design against: Domain tuning. |
| A signal-versus-noise trap in this use case: Duplicates | The true signal is semantic duplicate detection with linked answers; the common noise is keyword search. | Duplicates phrase the same doubt differently. |

**Ask the experts**

- [ ] What exactly does "Age-appropriate moderation" mean in practice for discussion forum q&a & moderation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Question similarity" and "Answer quality votes and instructor tags", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to first answer" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on toxic data from other domains, and who can confirm the cut-off times and splits?
- [ ] How often does "AI answer contradicts the instructor" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Item response theory (IRT) | A family of models relating the chance of a correct answer to a learner's ability and an item's parameters. |
| Distractor | A plausible wrong answer in a multiple-choice question, ideally reflecting a common misconception. |
| Learning path | An ordered sequence of content or skills tailored to a learner's goal. |
| Prerequisite graph | A directed graph of which skills must be learned before others. |
| Socratic tutoring | Guiding a learner to the answer with questions and hints instead of telling them. |
| Code plagiarism | Submitting another's program, often disguised by renaming variables or reordering code. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
| Context window | The maximum amount of text a model can read at once. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
