# Curriculum Standards Alignment & Tagging: data and feature specification

> Generated from the blueprint `edtech/curriculum-alignment-tagging` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Curriculum Standards Alignment & Tagging · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Curriculum Standards Alignment & Tagging": Tag content and assessments with curriculum standards and skills automatically, enabling precise search and gap analysis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test content similar to training.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Content-standard semantic similarity | embedding similarity | Candidates | Domain tuning |   |   |   |
| Verb and cognitive level | action verb taxonomy | Level match | Extraction |   |   |   |
| Existing tag co-occurrence | related tags | Consistency | Data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Hierarchy | Hierarchical multi-label classification | Flat tagging | Hierarchy handles large label spaces |
| Versions | Crosswalks between standard versions | Re-tag from scratch | Standards change often |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Content title only | insufficient |
| Author | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Content-standard semantic similarity inputs | Learning engineering | Learning management system (LMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: domain tuning. |
| Verb and cognitive level inputs | Registrar and data office | Student information system (SIS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: extraction. |
| Existing tag co-occurrence inputs | Content team | Content and item bank | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: curriculum_alignment_tagging_inputs.v1
owner: learning-engineering@example.com
system_of_record: Learning management system (LMS)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: content_standard_semantic_similarity, type: double, nullable: false }
    - { name: verb_and_cognitive_level, type: double, nullable: false }
    - { name: existing_tag_co_occurrence, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Content-standard semantic similarity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Verb and cognitive level against Learning management system (LMS)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Content-standard semantic similarity, traces back to Learning management system (LMS); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE curriculum_alignment_tagging_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE curriculum_alignment_tagging_fields (
  document_id TEXT NOT NULL REFERENCES curriculum_alignment_tagging_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE curriculum_alignment_tagging_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

A learning app presents questions, records whether each answer is right and decides what to show next. Knowledge tracing estimates, after every answer, how well the learner knows each skill, so the app can practise what they are weak at and stop when they have mastered it. The people who depend on the estimate are learners, teachers and parents, so it has to be understandable, calibrated and handled with the care owed to student data. For this use case, "Curriculum Standards Alignment & Tagging": Tag content and assessments with curriculum standards and skills automatically, enabling precise search and gap analysis. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Recommending learning content and paths | Learners choose courses, exercises and next steps. Prerequisite structures (a graph of skills), goals, time available and motivation shape what is useful; the aim is learning gain, not clicks. | Engagement and learning can diverge: the most clicked content may not be the most effective. |
| Skills, items and the Q-matrix | Curricula are broken into knowledge components, or skills, such as adding fractions. Each question (item) is tagged with one or more skills; the table of those tags is the Q-matrix. Mastery is tracked per skill, not per question. | Everything depends on the skill map. When the curriculum changes it, historical mastery can become wrong, so version it. |
| Item difficulty and ability: IRT | Item response theory describes the chance of a correct answer as a function of a learner's ability and the item's difficulty (and sometimes discrimination and guessing). The same learner is less likely to answer a hard item correctly. | Predictions must account for how hard the next question is, and difficulty should be learned from other students. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Content-standard semantic similarity | Embedding similarity. Candidates. | Leakage risk to design against: Domain tuning. |
| A signal-versus-noise trap in this use case: Hierarchy | The true signal is hierarchical multi-label classification; the common noise is flat tagging. | Hierarchy handles large label spaces. |

**Ask the experts**

- [ ] What exactly does "Many frameworks and versions" mean in practice for curriculum standards alignment & tagging: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Content-standard semantic similarity" and "Verb and cognitive level", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Tagging cost per item" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test content similar to training, and who can confirm the cut-off times and splits?
- [ ] How often does "New standards version published" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Curriculum standard | A published statement of what learners should know, such as a national standard, to which content is tagged. |
| Prerequisite graph | A directed graph of which skills must be learned before others. |
| Item | One question or exercise a learner can answer. |
| Formative / summative assessment | Assessment used to guide learning along the way, versus a final judgement of what was learned. |
| Learning path | An ordered sequence of content or skills tailored to a learner's goal. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
