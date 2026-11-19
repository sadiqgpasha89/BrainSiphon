# Developer Documentation Assistant: data and feature specification

> Generated from the blueprint `saas/developer-docs-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Developer Documentation Assistant · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Developer Documentation Assistant": Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on questions from docs headings.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| API existence check | referenced symbols found in spec | Catches invented endpoints and parameters before they reach the developer | Use the OpenAPI spec for the user's version |   |   |   |
| Snippet execution pass | sandbox run succeeds | Shows the code actually works, not just that it reads well | Run against the pinned SDK version in a test harness |   |   |   |
| Version match | docs version equals user version | A correct answer for the wrong version breaks the developer's code | Read the version from request context, not from the question text alone |   |   |   |
| Citation supports the value | the cited passage literally contains the stated value | Catches fabricated numbers and endpoints | A valid citation alone is not proof, because a changelog can cite both the old and the new value |   |   |   |
| Abstention precision | share of declined questions that are truly unanswerable | Shows whether refusals are justified | Needs labelled unanswerable questions kept out of tuning |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Version | Retrieve docs for the user's SDK version | Retrieving only the latest docs for every user | Version mismatch breaks code |
| Verification | Compile or run snippets in a sandbox | Trust generated code | LLMs invent plausible API calls |
| Abstention | Declining to answer when the docs do not state the fact | Always producing a fluent answer | A confident invented limit or endpoint costs developers hours |
| Evaluation | Held-out golden questions with unanswerable cases scored on facts | Questions written from docs headings and judged on fluency | Heading-derived questions are easy to retrieve and hide failures on real phrasing |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Answer verbosity | longer answers are not more helpful and hide the one fact the developer needs |
| Greeting text | adds tokens and nothing a developer can act on |
| Retrieval recall at five alone | easy on small corpora and silent about stale or invented answers |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| API existence check inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: use the OpenAPI spec for the user's version. |
| Snippet execution pass inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: run against the pinned SDK version in a test harness. |
| Version match inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: read the version from request context, not from the question text alone. |
| Citation supports the value inputs | Product analytics | Tenant and entitlement service | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: A valid citation alone is not proof, because a changelog can cite both the old and the new value. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: developer_docs_assistant_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: api_existence_check, type: double, nullable: false }
    - { name: snippet_execution_pass, type: double, nullable: false }
    - { name: version_match, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on API existence check and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Snippet execution pass against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as API existence check, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SQuAD 2.0 (Stanford Question Answering Dataset) | https://rajpurkar.github.io/SQuAD-explorer/ | CC BY-SA 4.0 (see the site) | Reading-comprehension questions over Wikipedia passages including about 50,000 unanswerable questions, ideal for testing abstention | Wikipedia prose, not API documentation; use it for the abstention protocol, not for domain retrieval quality |
| OpenAPI Directory (APIs.guru) | https://github.com/APIs-guru/openapi-directory | Specs keep their original licences; the repository is open under its own terms, check each API | Thousands of real OpenAPI definitions with versions, so you can test that every endpoint or parameter in an answer exists in the spec | Specs are not prose docs and vary in quality; pair them with real documentation pages to build questions |
| Stack Exchange data dump (Stack Overflow) | https://archive.org/details/stackexchange | CC BY-SA, with attribution requirements; read the terms on the page | Real developer questions with accepted answers and tags, useful for the way people actually phrase API questions | Answers can be wrong or out of date for the current version; treat them as phrasing data, not ground truth |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE developer_docs_assistant_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE developer_docs_assistant_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES developer_docs_assistant_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON developer_docs_assistant_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE developer_docs_assistant_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| The anatomy of API documentation | Docs usually combine an API reference (often generated from an OpenAPI specification), guides and tutorials, a changelog or release notes, and migration guides. Each answers a different kind of question, and they can disagree: a changelog legitimately mentions old values. | Retrieval should know which kind of page it is reading. Factual answers come from the reference for the right version, not from the changelog. |
| Versions and deprecation | APIs have versions (v1, v2), SDKs have their own semantic versions (major.minor.patch) per language, and features are deprecated with a sunset date before being removed. A breaking change is one that makes existing code stop working. | The right answer depends on which version the developer is using, so version must come from context and be shown in the answer. |
| OpenAPI as ground truth | An OpenAPI specification describes endpoints, parameters, request and response schemas and authentication in machine-readable form. Because it is precise, it can validate that every endpoint or field in a generated answer exists. | It turns hallucination checking from opinion into a lookup, and it is the cheapest strong guard you can add. |
| How retrieval-augmented answering fails | The assistant splits docs into chunks, retrieves the most relevant ones (keyword search, embeddings or both) and has a language model answer from them with citations. Failures include retrieving the wrong version, quoting a stale value from a changelog, inventing an endpoint, answering a question the docs never cover and a citation that exists but does not support the claim. | Each failure needs its own test. Measure them separately, not as one accuracy number. |
| Evaluating a docs assistant | A golden set of real questions with known answers, including unanswerable and version-specific ones, is scored for correctness, faithfulness to the cited source, abstention when the docs are silent and, for code, whether the snippet compiles and runs. Questions written from page headings are too easy. | Abstaining is a feature. A refusal that is right is better than an answer that is plausible and wrong. |
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |

**Ask the experts**

- [ ] Which API and SDK versions are supported, how will the assistant learn which one a developer is using, and what is the deprecation policy?
- [ ] When two pages disagree, which source is authoritative, and who owns the OpenAPI specification?
- [ ] What are the most common support tickets and wrong-answer complaints about the docs today?
- [ ] Which topics must the assistant refuse or hand off, such as billing, security advice or legal terms?
- [ ] Which languages and SDKs must generated code run in, and can we run it safely in a sandbox against a test account?

**Glossary**

| Term | Definition |
|---|---|
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| OpenAPI / Swagger | A standard machine-readable description of a REST API's endpoints, parameters and schemas. |
| REST | A common style of web API built around resources and HTTP methods. |
| Webhook | An HTTP callback in which a service notifies your server when an event happens. |
| Rate limit | The maximum number of requests allowed in a time window, with errors returned when exceeded. |
| Pagination | Returning large result sets in pages, using cursors or offsets. |
| Idempotency key | A unique value that makes a repeated request safe, so retries do not create duplicates. |
| Auth scope / OAuth | A permission granted to a token, and the standard protocol for delegated access. |
| Deprecation | Announcing that a feature will be removed, with a sunset date, while it still works. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Semantic versioning | A version number scheme (major.minor.patch) in which the major number changes for breaking changes. |
| Changelog | A dated list of what changed in each release, which quotes both old and new behaviour. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Chunk | A piece of a document, such as a section, that is indexed and retrieved as a unit. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Embedding | A vector representing the meaning of text, used for similarity search that tolerates different wording. |
| Reranking | A second-stage model that reorders retrieved passages by relevance to the question. |
| Grounding / citation | Basing an answer on retrieved text and pointing to the passage that supports it. |
| Hallucination | Output that sounds plausible but is not supported by the sources, such as an endpoint that does not exist. |
| Abstention | Declining to answer because the sources do not contain the answer. |
| Golden set | A fixed set of questions with verified answers used to score and compare versions of the system. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
