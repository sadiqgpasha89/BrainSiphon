# Teacher Dashboard Insights & Alerts: data and feature specification

> Generated from the blueprint `edtech/learning-analytics-teacher-insights` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Teacher Dashboard Insights & Alerts · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Teacher Dashboard Insights & Alerts": Summarise class and student learning data into prioritised, actionable insights for teachers, such as who needs help on which concept. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rating insights without outcome follow-up.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Concept-level class mastery gaps | share below mastery by concept | Reteach target | KT |   |   |   |
| At-risk student cluster | similar struggle patterns | Small-group intervention | Clustering |   |   |   |
| Insight usefulness score | teacher acts on insight | Feedback | Logging |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Actionability | Insights tied to an action and a student group | Dashboards of raw metrics | Teachers lack time to interpret raw charts |
| Priority | Rank by expected learning impact | Rank by anomaly score | Anomalies may not matter educationally |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Raw clicks | noise |
| Login counts | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Concept-level class mastery gaps inputs | Learning engineering | Learning management system (LMS) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: KT. |
| At-risk student cluster inputs | Registrar and data office | Student information system (SIS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: clustering. |
| Insight usefulness score inputs | Content team | Content and item bank | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: logging. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: learning_analytics_teacher_insights_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: concept_level_class_mastery_gaps, type: double, nullable: false }
    - { name: at_risk_student_cluster, type: double, nullable: false }
    - { name: insight_usefulness_score, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Concept-level class mastery gaps and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for At-risk student cluster against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Concept-level class mastery gaps, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE learning_analytics_teacher_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE learning_analytics_teacher_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES learning_analytics_teacher_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON learning_analytics_teacher_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE learning_analytics_teacher_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Teacher Dashboard Insights & Alerts": Summarise class and student learning data into prioritised, actionable insights for teachers, such as who needs help on which concept. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| AI tutors and teacher copilots | Tutoring assistants guide students with hints and questions; teacher copilots draft lessons, questions and feedback. Good tutoring avoids giving away answers, stays within the curriculum and flags misconceptions; safety rules for minors apply. | Evaluate on learning outcomes and teacher time saved, and test explicitly for answer leakage and off-curriculum content. |
| Mastery is hidden; answers are noisy evidence | A learner may guess correctly without knowing, or slip and answer wrongly despite knowing. Models such as Bayesian Knowledge Tracing treat mastery as a hidden state with parameters for the chance of learning on each attempt, guessing and slipping. Performance Factors Analysis instead predicts the next answer from counts of earlier successes and failures. | A correct answer is not learning. The model must reason about evidence, and a single success should not declare mastery. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Concept-level class mastery gaps | Share below mastery by concept. Reteach target. | Leakage risk to design against: KT. |
| A signal-versus-noise trap in this use case: Actionability | The true signal is insights tied to an action and a student group; the common noise is dashboards of raw metrics. | Teachers lack time to interpret raw charts. |

**Ask the experts**

- [ ] What exactly does "Teacher time budget" mean in practice for teacher dashboard insights & alerts: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Concept-level class mastery gaps" and "At-risk student cluster", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Insights acted on" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: rating insights without outcome follow-up, and who can confirm the cut-off times and splits?
- [ ] How often does "Small classes produce noisy insights" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning analytics | Using learner data to understand and improve learning and teaching. |
| Learning management system (LMS) | The platform where courses, materials, submissions and grades are managed. |
| Mastery learning | An instructional approach in which learners move on only after demonstrating mastery of a skill. |
| Learning gain | The improvement in a learner's measured knowledge between two points, the outcome the system exists to increase. |
| Peer learning | Students learning together in groups, where group composition affects outcomes. |
| Opportunity count | How many times a learner has practised a skill so far. |
| PII in learner data | Personal information such as names and IDs inside student text and logs that must be protected. |
| Uplift (learning) | The extra learning gain caused by an intervention compared with none. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| F1 score | The harmonic mean of precision and recall. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| p99 latency | The time within which 99% of requests complete. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
