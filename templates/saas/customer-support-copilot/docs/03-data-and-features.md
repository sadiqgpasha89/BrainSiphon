# Customer Support Agent Copilot: data and feature specification

> Generated from the blueprint `saas/customer-support-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Support Agent Copilot · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Customer Support Agent Copilot": Draft grounded replies, summarise threads and surface relevant articles and past tickets so support agents resolve faster with consistent quality. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judging fluency; ignoring correctness.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| KB citation coverage | share of statements cited | Faithfulness | Verification |   |   |   |
| Resolution similarity | similar past ticket resolved with this answer | Precedent | Retrieval |   |   |   |
| Agent edit distance | edits to the draft | Quality | Logging |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Grounding | Retrieval over KB, product docs and similar resolved tickets | Model memory | Product details change monthly |
| Control | Agent edits and approves | Auto-send | Wrong answers to customers damage trust |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Ticket greeting text | cosmetic |
| Draft length | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| KB citation coverage inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: verification. |
| Resolution similarity inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: retrieval. |
| Agent edit distance inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: logging. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: customer_support_copilot_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: kb_citation_coverage, type: double, nullable: false }
    - { name: resolution_similarity, type: double, nullable: false }
    - { name: agent_edit_distance, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on KB citation coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Resolution similarity against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as KB citation coverage, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE customer_support_copilot_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE customer_support_copilot_steps (
  task_id TEXT NOT NULL REFERENCES customer_support_copilot_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE customer_support_copilot_approvals (
  task_id TEXT NOT NULL REFERENCES customer_support_copilot_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Customer Support Agent Copilot": Draft grounded replies, summarise threads and surface relevant articles and past tickets so support agents resolve faster with consistent quality. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| OpenAPI as ground truth | An OpenAPI specification describes endpoints, parameters, request and response schemas and authentication in machine-readable form. Because it is precise, it can validate that every endpoint or field in a generated answer exists. | It turns hallucination checking from opinion into a lookup, and it is the cheapest strong guard you can add. |
| Support, success and the copilots that help them | Support teams answer tickets with help-centre articles and past replies; success managers prepare reviews for customers. Assistants draft replies, route tickets and summarise calls, with accuracy, tone and policy compliance as constraints. | Deflection that hides a wrong answer costs more than a ticket, so assistants must cite sources and escalate when unsure. |
| The anatomy of API documentation | Docs usually combine an API reference (often generated from an OpenAPI specification), guides and tutorials, a changelog or release notes, and migration guides. Each answers a different kind of question, and they can disagree: a changelog legitimately mentions old values. | Retrieval should know which kind of page it is reading. Factual answers come from the reference for the right version, not from the changelog. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: KB citation coverage | Share of statements cited. Faithfulness. | Leakage risk to design against: Verification. |
| A signal-versus-noise trap in this use case: Grounding | The true signal is retrieval over KB, product docs and similar resolved tickets; the common noise is model memory. | Product details change monthly. |

**Ask the experts**

- [ ] What exactly does "Answers grounded in KB and account data" mean in practice for customer support agent copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "KB citation coverage" and "Resolution similarity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Handle time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: judging fluency; ignoring correctness, and who can confirm the cut-off times and splits?
- [ ] How often does "Product release changes behaviour" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Grounding / citation | Basing an answer on retrieved text and pointing to the passage that supports it. |
| Knowledge base | The collection of help articles an assistant can retrieve and cite. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Semantic versioning | A version number scheme (major.minor.patch) in which the major number changes for breaking changes. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| OpenAPI / Swagger | A standard machine-readable description of a REST API's endpoints, parameters and schemas. |
| REST | A common style of web API built around resources and HTTP methods. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
