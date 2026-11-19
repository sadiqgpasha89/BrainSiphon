# Natural Language to SQL for Analytics: data and feature specification

> Generated from the blueprint `saas/natural-language-to-sql` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Natural Language to SQL for Analytics · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Natural Language to SQL for Analytics": Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Benchmark leakage.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Schema linking accuracy | right tables and columns | Correctness | Metadata quality |   |   |   |
| Execution validity and sanity | runs and passes sanity checks | Safety | Checks |   |   |   |
| Query cost estimate | planner cost | Guardrail | Warehouse |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Semantics | Query through a metrics layer with definitions | Raw schema generation | Same word means different metrics |
| Evaluation | Execution accuracy on golden queries | Exact string match | Different SQL can give the same correct result |

## Features to drop

| Feature | Why it is noise |
|---|---|
| SQL formatting | cosmetic |
| Question length | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Schema linking accuracy inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: metadata quality. |
| Execution validity and sanity inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: checks. |
| Query cost estimate inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: warehouse. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: natural_language_to_sql_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: schema_linking_accuracy, type: double, nullable: false }
    - { name: execution_validity_and_sanity, type: double, nullable: false }
    - { name: query_cost_estimate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Schema linking accuracy and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Execution validity and sanity against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Schema linking accuracy, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BIRD text-to-SQL benchmark | https://bird-bench.github.io/ | CC BY-SA 4.0 (see the site) | A large benchmark of questions over big, messy databases with external knowledge | Execution cost is high. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE natural_language_to_sql_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE natural_language_to_sql_steps (
  task_id TEXT NOT NULL REFERENCES natural_language_to_sql_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE natural_language_to_sql_approvals (
  task_id TEXT NOT NULL REFERENCES natural_language_to_sql_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Natural Language to SQL for Analytics": Let business users ask questions in plain language and receive correct SQL and results using a governed semantic layer. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Data platforms, quality and ML operations | Data pipelines move events into warehouses; data quality checks catch schema and volume problems; ML platforms track models, drift, evaluation of language-model applications and costs. Gateways route requests between models by cost and quality. | Many model failures are data failures; monitoring inputs and outputs is as important as the model. |
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |
| Engineering productivity and developer tools | Code completion, review, test selection, flaky test detection, deployment risk and pull-request summarisation reduce developer toil. Quality is measured by acceptance, correctness (do the tests pass) and trust; noisy tools get switched off. | Offline benchmarks like pass rates on toy problems do not predict real-world usefulness; measure acceptance and time saved in real repositories. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Schema linking accuracy | Right tables and columns. Correctness. | Leakage risk to design against: Metadata quality. |
| A signal-versus-noise trap in this use case: Semantics | The true signal is query through a metrics layer with definitions; the common noise is raw schema generation. | Same word means different metrics. |

**Ask the experts**

- [ ] What exactly does "Row-level security" mean in practice for natural language to sql for analytics: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Schema linking accuracy" and "Execution validity and sanity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Self-serve query success" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: benchmark leakage, and who can confirm the cut-off times and splits?
- [ ] How often does "Ambiguous metric names" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Text-to-SQL | Generating database queries from natural-language questions. |
| Schema matching | Mapping the columns of one data source to the fields of another. |
| LLM gateway | A service that routes language-model requests between providers by cost, latency and quality. |
| LLM-as-judge | Using a language model to grade another model's outputs, calibrated against human labels. |
| Rate limit | The maximum number of requests allowed in a time window, with errors returned when exceeded. |
| Semantic versioning | A version number scheme (major.minor.patch) in which the major number changes for breaking changes. |
| Golden set | A fixed set of questions with verified answers used to score and compare versions of the system. |
| Seat-based pricing | Charging per user of the product. |
| Feature flag | A switch that turns a feature on for chosen users, used for gradual rollouts and experiments. |
| QBR | Quarterly business review: a meeting where a customer success manager reviews value delivered with a customer. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
