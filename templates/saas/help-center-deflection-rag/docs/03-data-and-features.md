# Help-Centre Deflection with RAG: data and feature specification

> Generated from the blueprint `saas/help-center-deflection-rag` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Help-Centre Deflection with RAG · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Help-Centre Deflection with RAG": Resolve customer questions in self-service with a grounded assistant, deflecting tickets while keeping satisfaction and escalation safe. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting abandonment as deflection.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Answer groundedness | claims supported by docs | Safety | NLI |   |   |   |
| Recontact rate within 7 days | same user opens a ticket | True resolution | Windows |   |   |   |
| Query-coverage gap | queries with no good doc | Content gap | Retrieval confidence |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Success | Resolution confirmed by user or no recontact | Deflection count | Frustrated users abandon rather than succeed |
| Content | Fix docs gaps found by failed queries | Only tune the model | Many failures are missing documentation |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Chat turns | not success |
| Thumbs-up rate alone | biased |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Answer groundedness inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: NLI. |
| Recontact rate within 7 days inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: windows. |
| Query-coverage gap inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: retrieval confidence. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: help_center_deflection_rag_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: answer_groundedness, type: double, nullable: false }
    - { name: recontact_rate_within_7_days, type: double, nullable: false }
    - { name: query_coverage_gap, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Answer groundedness and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Recontact rate within 7 days against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Answer groundedness, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CodeSearchNet | https://github.com/github/CodeSearchNet | MIT licence plus per-project licences (see the repository) | About 2 million functions with natural-language documentation in six languages | Docstrings are not user queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE help_center_deflection_rag_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE help_center_deflection_rag_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES help_center_deflection_rag_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON help_center_deflection_rag_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE help_center_deflection_rag_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Help-Centre Deflection with RAG": Resolve customer questions in self-service with a grounded assistant, deflecting tickets while keeping satisfaction and escalation safe. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| OpenAPI as ground truth | An OpenAPI specification describes endpoints, parameters, request and response schemas and authentication in machine-readable form. Because it is precise, it can validate that every endpoint or field in a generated answer exists. | It turns hallucination checking from opinion into a lookup, and it is the cheapest strong guard you can add. |
| How retrieval-augmented answering fails | The assistant splits docs into chunks, retrieves the most relevant ones (keyword search, embeddings or both) and has a language model answer from them with citations. Failures include retrieving the wrong version, quoting a stale value from a changelog, inventing an endpoint, answering a question the docs never cover and a citation that exists but does not support the claim. | Each failure needs its own test. Measure them separately, not as one accuracy number. |
| Evaluating a docs assistant | A golden set of real questions with known answers, including unanswerable and version-specific ones, is scored for correctness, faithfulness to the cited source, abstention when the docs are silent and, for code, whether the snippet compiles and runs. Questions written from page headings are too easy. | Abstaining is a feature. A refusal that is right is better than an answer that is plausible and wrong. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Answer groundedness | Claims supported by docs. Safety. | Leakage risk to design against: NLI. |
| A signal-versus-noise trap in this use case: Success | The true signal is resolution confirmed by user or no recontact; the common noise is deflection count. | Frustrated users abandon rather than succeed. |

**Ask the experts**

- [ ] What exactly does "Deflection without satisfaction loss" mean in practice for help-centre deflection with rag: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Answer groundedness" and "Recontact rate within 7 days", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Verified resolution rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: counting abandonment as deflection, and who can confirm the cut-off times and splits?
- [ ] How often does "Docs for a new feature are not yet published" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Auth scope / OAuth | A permission granted to a token, and the standard protocol for delegated access. |
| Abstention | Declining to answer because the sources do not contain the answer. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| OpenAPI / Swagger | A standard machine-readable description of a REST API's endpoints, parameters and schemas. |
| REST | A common style of web API built around resources and HTTP methods. |
| Webhook | An HTTP callback in which a service notifies your server when an event happens. |
| Rate limit | The maximum number of requests allowed in a time window, with errors returned when exceeded. |
| Pagination | Returning large result sets in pages, using cursors or offsets. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Reranking | Reordering retrieved passages with a more precise model. |
| Context window | The maximum amount of text a model can read at once. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
