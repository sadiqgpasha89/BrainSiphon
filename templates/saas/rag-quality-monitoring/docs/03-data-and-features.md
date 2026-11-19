# RAG Quality Monitoring in Production: data and feature specification

> Generated from the blueprint `saas/rag-quality-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** RAG Quality Monitoring in Production · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "RAG Quality Monitoring in Production": Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Ratings used as quality.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Retrieval hit rate on judged queries | gold passage in top-k | Retrieval health | Labels |   |   |   |
| Groundedness rate | answers supported by retrieved text | Hallucination | NLI |   |   |   |
| Unanswerable-query rate | queries with no relevant doc | Content gap | Classifier |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Diagnosis | Separate retrieval failures from generation failures | End-to-end score only | Fixes differ: retrieval vs prompt vs content |
| Gaps | Detect missing-content queries | Treat all failures as model errors | Missing docs need content, not tuning |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Answer length | weak |
| Latency alone | not quality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Retrieval hit rate on judged queries inputs | Product analytics | Tenant and entitlement service | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: labels. |
| Groundedness rate inputs | Platform engineering | Product event warehouse | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: NLI. |
| Unanswerable-query rate inputs | Customer success operations | CRM and billing (subscriptions) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: classifier. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: rag_quality_monitoring_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: retrieval_hit_rate_on_judged_queries, type: double, nullable: false }
    - { name: groundedness_rate, type: double, nullable: false }
    - { name: unanswerable_query_rate, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Retrieval hit rate on judged queries and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Groundedness rate against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Retrieval hit rate on judged queries, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE rag_quality_monitoring_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE rag_quality_monitoring_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES rag_quality_monitoring_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON rag_quality_monitoring_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE rag_quality_monitoring_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "RAG Quality Monitoring in Production": Monitor retrieval relevance, groundedness and user outcomes of RAG apps in production, spotting content gaps and regressions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| OpenAPI as ground truth | An OpenAPI specification describes endpoints, parameters, request and response schemas and authentication in machine-readable form. Because it is precise, it can validate that every endpoint or field in a generated answer exists. | It turns hallucination checking from opinion into a lookup, and it is the cheapest strong guard you can add. |
| Reliability engineering and AIOps | Operations teams run services against reliability targets (SLOs). Monitoring produces metrics, logs and traces; models detect anomalies, forecast capacity, correlate alerts, find root causes and sample traces. Incidents are rare, labels are scarce and systems change constantly. | Alert noise and unexplained pages burn out on-call engineers, so precision, grouping and actionable context come first. |
| The anatomy of API documentation | Docs usually combine an API reference (often generated from an OpenAPI specification), guides and tutorials, a changelog or release notes, and migration guides. Each answers a different kind of question, and they can disagree: a changelog legitimately mentions old values. | Retrieval should know which kind of page it is reading. Factual answers come from the reference for the right version, not from the changelog. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Retrieval hit rate on judged queries | Gold passage in top-k. Retrieval health. | Leakage risk to design against: Labels. |
| A signal-versus-noise trap in this use case: Diagnosis | The true signal is separate retrieval failures from generation failures; the common noise is end-to-end score only. | Fixes differ: retrieval vs prompt vs content. |

**Ask the experts**

- [ ] What exactly does "Online sampling cost" mean in practice for rag quality monitoring in production: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Retrieval hit rate on judged queries" and "Groundedness rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Resolution rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: ratings used as quality, and who can confirm the cut-off times and splits?
- [ ] How often does "Index update lags" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| RAG monitoring | Checking that retrieval-augmented answers remain grounded in their sources over time. |
| LLM-as-judge | Using a language model to grade another model's outputs, calibrated against human labels. |
| Rate limit | The maximum number of requests allowed in a time window, with errors returned when exceeded. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Hallucination | Output that sounds plausible but is not supported by the sources, such as an endpoint that does not exist. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| OpenAPI / Swagger | A standard machine-readable description of a REST API's endpoints, parameters and schemas. |
| REST | A common style of web API built around resources and HTTP methods. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Reranking | Reordering retrieved passages with a more precise model. |
| Distribution shift | A change in the data a model sees compared with training. |
| p99 latency | The time within which 99% of requests complete. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
