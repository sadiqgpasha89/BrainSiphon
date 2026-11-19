# Email Assistant & Smart Replies: data and feature specification

> Generated from the blueprint `saas/email-assistant-auto-reply` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Email Assistant & Smart Replies · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Email Assistant & Smart Replies": Draft replies that match the user's tone and context, and triage inbox priorities, with the user always approving sends. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on generic emails.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Draft acceptance rate | drafts sent with few edits | Quality | Logging |   |   |   |
| Thread context completeness | referenced entities resolved | Accuracy | Retrieval |   |   |   |
| Priority score | importance prediction | Triage | Feedback |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Control | Draft-and-approve | Auto-send | Wrong auto-sent emails are unrecoverable |
| Style | Personalise from the user's sent mail with privacy | Generic tone | Generic tone feels off and is rarely sent |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Email length | weak |
| Sender domain popularity | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Draft acceptance rate inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: logging. |
| Thread context completeness inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: retrieval. |
| Priority score inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: feedback. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: email_assistant_auto_reply_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: draft_acceptance_rate, type: double, nullable: false }
    - { name: thread_context_completeness, type: double, nullable: false }
    - { name: priority_score, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Draft acceptance rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Thread context completeness against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Draft acceptance rate, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
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
CREATE TABLE email_assistant_auto_reply_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE email_assistant_auto_reply_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES email_assistant_auto_reply_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON email_assistant_auto_reply_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE email_assistant_auto_reply_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Email Assistant & Smart Replies": Draft replies that match the user's tone and context, and triage inbox priorities, with the user always approving sends. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Evaluating a docs assistant | A golden set of real questions with known answers, including unanswerable and version-specific ones, is scored for correctness, faithfulness to the cited source, abstention when the docs are silent and, for code, whether the snippet compiles and runs. Questions written from page headings are too easy. | Abstaining is a feature. A refusal that is right is better than an answer that is plausible and wrong. |
| The anatomy of API documentation | Docs usually combine an API reference (often generated from an OpenAPI specification), guides and tutorials, a changelog or release notes, and migration guides. Each answers a different kind of question, and they can disagree: a changelog legitimately mentions old values. | Retrieval should know which kind of page it is reading. Factual answers come from the reference for the right version, not from the changelog. |
| Versions and deprecation | APIs have versions (v1, v2), SDKs have their own semantic versions (major.minor.patch) per language, and features are deprecated with a sunset date before being removed. A breaking change is one that makes existing code stop working. | The right answer depends on which version the developer is using, so version must come from context and be shown in the answer. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Draft acceptance rate | Drafts sent with few edits. Quality. | Leakage risk to design against: Logging. |
| A signal-versus-noise trap in this use case: Control | The true signal is draft-and-approve; the common noise is auto-send. | Wrong auto-sent emails are unrecoverable. |

**Ask the experts**

- [ ] What exactly does "Never auto-send sensitive content" mean in practice for email assistant & smart replies: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Draft acceptance rate" and "Thread context completeness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time spent on email" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on generic emails, and who can confirm the cut-off times and splits?
- [ ] How often does "Draft invents a commitment or date" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Email assistant | A tool that drafts replies in the user's style from the thread. |
| Meeting notes and action items | Summaries and tasks extracted from meetings, where attributing owners correctly is the main failure. |
| Auth scope / OAuth | A permission granted to a token, and the standard protocol for delegated access. |
| Hallucination | Output that sounds plausible but is not supported by the sources, such as an endpoint that does not exist. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| OpenAPI / Swagger | A standard machine-readable description of a REST API's endpoints, parameters and schemas. |
| REST | A common style of web API built around resources and HTTP methods. |
| Webhook | An HTTP callback in which a service notifies your server when an event happens. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Context window | The maximum amount of text a model can read at once. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
