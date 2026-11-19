# Admissions & Student Support Assistant: data and feature specification

> Generated from the blueprint `edtech/admissions-and-student-support-chatbot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Admissions & Student Support Assistant · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Admissions & Student Support Assistant": Answer applicants' and students' questions about admissions, fees, deadlines and services accurately, escalating to staff when needed. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Golden set not updated for the new cycle.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Source recency | effective date of cited document | Correctness | Metadata |   |   |   |
| Answer support rate | claims supported by cited documents | Faithfulness | NLI |   |   |   |
| Escalation precision | handoffs that needed staff | Efficiency | Review |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Freshness | Retrieval from versioned official sources | Static training data | Deadlines and fees change every year |
| Escalation | Confidence and topic-based handoff | Always answering | Wrong answers about visas or fees cause real harm |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Chat length | weak |
| Greeting style | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Source recency inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: metadata. |
| Answer support rate inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: NLI. |
| Escalation precision inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: review. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: admissions_and_student_support_chatbot_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: source_recency, type: double, nullable: false }
    - { name: answer_support_rate, type: double, nullable: false }
    - { name: escalation_precision, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Source recency and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Answer support rate against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Source recency, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE admissions_and_student_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE admissions_and_student_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES admissions_and_student_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON admissions_and_student_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE admissions_and_student_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Admissions & Student Support Assistant": Answer applicants' and students' questions about admissions, fees, deadlines and services accurately, escalating to staff when needed. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Operations: timetabling, admissions and support | Institutions schedule exams and classrooms, match students to scholarships and programmes, answer admissions questions and triage support tickets. Constraints are hard (no clashes), fairness is audited, and stakeholders contest decisions. | Optimisation and scoring systems here are judged on feasibility and fairness, and every decision needs an explanation. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Source recency | Effective date of cited document. Correctness. | Leakage risk to design against: Metadata. |
| A signal-versus-noise trap in this use case: Freshness | The true signal is retrieval from versioned official sources; the common noise is static training data. | Deadlines and fees change every year. |

**Ask the experts**

- [ ] What exactly does "Accuracy on deadlines and fees" mean in practice for admissions & student support assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Source recency" and "Answer support rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Deflection with satisfaction" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: golden set not updated for the new cycle, and who can confirm the cut-off times and splits?
- [ ] How often does "Policy changed this week" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Admissions | The process of selecting applicants for a programme, subject to fairness and legal rules. |
| Equity audit | Checking whether outcomes differ systematically between groups of students. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Opportunity count | How many times a learner has practised a skill so far. |
| Distractor | A plausible wrong answer in a multiple-choice question, ideally reflecting a common misconception. |
| Misconception | A systematic wrong idea a learner holds, which wrong answers can reveal. |
| Socratic tutoring | Guiding a learner to the answer with questions and hints instead of telling them. |
| Scaffolding | Temporary support that is gradually removed as a learner becomes capable. |
| Formative feedback | Comments that help a learner improve while they are still learning. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Golden set | A fixed set of questions with verified answers used to score versions of a system. |
