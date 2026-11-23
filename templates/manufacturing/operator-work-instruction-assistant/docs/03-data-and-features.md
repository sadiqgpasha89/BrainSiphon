# Operator Work-Instruction Assistant: data and feature specification

> Generated from the blueprint `manufacturing/operator-work-instruction-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Operator Work-Instruction Assistant · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Operator Work-Instruction Assistant": Answer operator questions about work instructions, quality checks and changeover steps at the station, in the operator's language, from controlled documents only. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Free translation of safety steps.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Station and product context | station and the product on it | Retrieves the right instruction | From MES |   |   |   |
| Document revision status | current or superseded | Prevents old steps | From document control |   |   |   |
| Question intent | procedure, parameter, defect or safety | Routes the answer | Classified |   |   |   |
| Operator qualification | certification for the task | Gates steps | From training records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | The current controlled instruction | Model memory | Wrong instructions cause scrap and injuries |
| Language | Translations checked by quality | Free translation by the model | Translation errors in safety steps are dangerous |
| Scope | Questions about the task at the station | Open chat | Off-topic chat distracts |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Operator name | irrelevant |
| Time of day | irrelevant |
| Device model | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Station and product context inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from MES. |
| Document revision status inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from document control. |
| Question intent inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: classified. |
| Operator qualification inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from training records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: operator_work_instruction_assistant_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: station_and_product_context, type: double, nullable: false }
    - { name: document_revision_status, type: double, nullable: false }
    - { name: question_intent, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Station and product context and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Document revision status against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Station and product context, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CodeSearchNet | https://github.com/github/CodeSearchNet | MIT licence plus per-project licences (see the repository) | About 2 million functions with natural-language documentation in six languages | Docstrings are not user queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE operator_work_instruction_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE operator_work_instruction_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES operator_work_instruction_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON operator_work_instruction_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE operator_work_instruction_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Operator Work-Instruction Assistant": Answer operator questions about work instructions, quality checks and changeover steps at the station, in the operator's language, from controlled documents only. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Station and product context | Station and the product on it. Retrieves the right instruction. | Leakage risk to design against: From MES. |
| A signal-versus-noise trap in this use case: Source | The true signal is the current controlled instruction; the common noise is model memory. | Wrong instructions cause scrap and injuries. |

**Ask the experts**

- [ ] What exactly does "Answers come from the controlled document set with revision numbers" mean in practice for operator work-instruction assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Station and product context" and "Document revision status", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Operator questions to supervisors" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: free translation of safety steps, and who can confirm the cut-off times and splits?
- [ ] How often does "Superseded instruction" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| First pass yield | The share of units that pass without rework. |
| Scrap | Material or parts that cannot be sold. |
| Cycle time | The time to complete one unit of work at a station. |
| Changeover | The time to switch a machine from one product to another. |
| Rework | Fixing a defective part so it can be sold. |
| CMMS | Computerised maintenance management system for work orders and assets. |
| Setpoint | The target value of a process variable. |
| Work order | An instruction to produce or repair something. |
| Six Sigma | A method for reducing defects through data. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Context window | The maximum amount of text a model can read at once. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
