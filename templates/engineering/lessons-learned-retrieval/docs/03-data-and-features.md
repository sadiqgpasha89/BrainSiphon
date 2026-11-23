# Lessons Learned Retrieval: data and feature specification

> Generated from the blueprint `engineering/lessons-learned-retrieval` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lessons Learned Retrieval · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Lessons Learned Retrieval": Capture lessons from project closeouts and incident reports and surface relevant ones at design, bid and planning stages with source links. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Raw closeout text.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Lesson text and tags | issue, cause and action | Core | From closeouts |   |   |   |
| Project type and phase | context match | Relevance | From project data |   |   |   |
| Outcome evidence | cost or time effect | Weight | From records |   |   |   |
| Recency and validity | whether the lesson still applies | Filter | From owners |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Confirmed lessons with context | Raw closeout text | Raw text is noisy |
| Privacy | Redacted client details | Full project names across clients | Clients expect confidentiality |
| Use | Surfaced at the decision point | An archive | Archives are not read |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Author name | personal data |
| Client name | confidential |
| Document template | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Lesson text and tags inputs | Engineering management | CAD, BIM and document management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from closeouts. |
| Project type and phase inputs | Project delivery | Project scheduling and cost control platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from project data. |
| Outcome evidence inputs | Health, safety and quality | Quality, safety and inspection records | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from records. |
| Recency and validity inputs | Engineering management | CAD, BIM and document management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from owners. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: lessons_learned_retrieval_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: lesson_text_and_tags, type: double, nullable: false }
    - { name: project_type_and_phase, type: double, nullable: false }
    - { name: outcome_evidence, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Lesson text and tags and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Project type and phase against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Lesson text and tags, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CodeSearchNet | https://github.com/github/CodeSearchNet | MIT licence plus per-project licences (see the repository) | About 2 million functions with natural-language documentation in six languages | Docstrings are not user queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE lessons_learned_retrieval_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE lessons_learned_retrieval_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES lessons_learned_retrieval_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON lessons_learned_retrieval_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE lessons_learned_retrieval_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Lessons Learned Retrieval": Capture lessons from project closeouts and incident reports and surface relevant ones at design, bid and planning stages with source links. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Cost grows through change | Cost overruns come from scope change, design maturity, market prices and productivity. Early estimates carry wide uncertainty that narrows as design matures. | Reporting a single number at an early stage hides the range. |
| Contracts allocate risk | Contract terms decide who pays for delay, change and defects, and disputes depend on records kept at the time. Contemporaneous, linked records are the evidence. | Missing records weaken a claim long after the work is done. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Lesson text and tags | Issue, cause and action. Core. | Leakage risk to design against: From closeouts. |
| A signal-versus-noise trap in this use case: Source | The true signal is confirmed lessons with context; the common noise is raw closeout text. | Raw text is noisy. |

**Ask the experts**

- [ ] What exactly does "Lessons cite the source project and date" mean in practice for lessons learned retrieval: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Lesson text and tags" and "Project type and phase", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Repeated mistakes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: raw closeout text, and who can confirm the cut-off times and splits?
- [ ] How often does "Outdated lesson" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lessons learned | Knowledge captured from past projects. |
| Health and safety plan | A plan for managing risk on a project. |
| Change order | A formal change to scope, cost or time. |
| Contingency | An allowance for uncertain costs. |
| Claim | A request for extra time or money under a contract. |
| Engineer of record | The licensed engineer responsible for a design. |
| Context window | The maximum amount of text a model can read at once. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Reranking | Reordering retrieved passages with a more precise model. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
