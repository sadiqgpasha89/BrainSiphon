# Engineering Knowledge Assistant: data and feature specification

> Generated from the blueprint `engineering/engineering-knowledge-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Knowledge Assistant · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Engineering Knowledge Assistant": Answer engineering questions from company standards, past design reports, lessons learned and calculations with citations, respecting project and client access rights. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model memory of standards.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Document relevance | semantic and keyword match | Core | From hybrid search |   |   |   |
| Document status and revision | released, draft or superseded | Filter | From the document system |   |   |   |
| Access rights | project and client permissions | Gate | From identity |   |   |   |
| Discipline and project type | context of the question | Ranking | From metadata |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Released documents and standards | Model memory | Standards and designs change |
| Access | Client-segregated indexes | One shared index | Client information must stay separate |
| Trust | Citations with revision | Unsourced answers | Engineers must verify |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Asker name | personal data |
| Chat length | weak link |
| File format | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Document relevance inputs | Engineering management | CAD, BIM and document management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from hybrid search. |
| Document status and revision inputs | Project delivery | Project scheduling and cost control platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the document system. |
| Access rights inputs | Health, safety and quality | Quality, safety and inspection records | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from identity. |
| Discipline and project type inputs | Engineering management | CAD, BIM and document management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from metadata. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: engineering_knowledge_assistant_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: document_relevance, type: double, nullable: false }
    - { name: document_status_and_revision, type: double, nullable: false }
    - { name: access_rights, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Document relevance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Document status and revision against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Document relevance, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE engineering_knowledge_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE engineering_knowledge_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES engineering_knowledge_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON engineering_knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE engineering_knowledge_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Engineering Knowledge Assistant": Answer engineering questions from company standards, past design reports, lessons learned and calculations with citations, respecting project and client access rights. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Drawings and models carry the design information | Information sits in CAD drawings, PDFs and BIM models, often in different revisions and disciplines. Reading it reliably is a prerequisite for most automation. | Using the wrong revision is a common and costly error. |
| Clashes between disciplines are common | Structure, services and architecture are modelled by different teams, and their elements collide. Not every clash needs action, and the important ones sit among thousands of minor ones. | Prioritising by impact and construction timing makes coordination meetings useful. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Document relevance | Semantic and keyword match. Core. | Leakage risk to design against: From hybrid search. |
| A signal-versus-noise trap in this use case: Source | The true signal is released documents and standards; the common noise is model memory. | Standards and designs change. |

**Ask the experts**

- [ ] What exactly does "Every answer cites document, revision and page" mean in practice for engineering knowledge assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Document relevance" and "Document status and revision", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to find information" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: model memory of standards, and who can confirm the cut-off times and splits?
- [ ] How often does "Superseded standard" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Lessons learned | Knowledge captured from past projects. |
| Drawing revision | A numbered version of a drawing. |
| Engineer of record | The licensed engineer responsible for a design. |
| BIM | Building information modelling: a digital model of a building or asset with data. |
| CAD | Computer-aided design software for drawings and models. |
| RFI | Request for information: a question sent to the design team during construction. |
| Health and safety plan | A plan for managing risk on a project. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Context window | The maximum amount of text a model can read at once. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
