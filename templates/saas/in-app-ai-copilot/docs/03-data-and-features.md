# In-App AI Copilot for SaaS Products: data and feature specification

> Generated from the blueprint `saas/in-app-ai-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** In-App AI Copilot for SaaS Products · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "In-App AI Copilot for SaaS Products": Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Golden tasks too easy.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Tool-call validity rate | calls passing schema validation | Reliability | Schemas |   |   |   |
| Task success rate | tasks completed as intended | Value | Instrumentation |   |   |   |
| Confirmation acceptance | user approvals of previews | Safety | UI |   |   |   |
| Plan-hash confirmation match | share of executed mutations whose signed confirmation matches the previewed plan hash | Integrity of the commit step | Record the hash at preview time, not at execution |   |   |   |
| Idempotency replay rate | retries or double clicks absorbed without a second effect | Safety under retries | Keys must be scoped to user, plan and step |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Authority | Execute with the user's scoped permissions | Service-account superuser | A hijacked copilot must not exceed the user's rights |
| Reliability | Typed tools with validation and dry-run | Free-form API calls | Free-form calls produce invalid or dangerous requests |
| Credentials | User-scoped short-lived tokens via RFC 8693 token exchange passed through the orchestrator to product APIs | A super-admin or service token inside the agent | A jailbroken agent holding a service token bypasses tenant isolation and row-level security |
| Mutations | Plan, preview, commit: a dry-run diff rendered as a UI card and a signed user confirmation bound to the plan hash | Executing the model tool call directly | A prompt injection or a misread request becomes an irreversible write |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Chat turns | not success |
| Response length | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Tool-call validity rate inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: schemas. |
| Task success rate inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: instrumentation. |
| Confirmation acceptance inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: UI. |
| Plan-hash confirmation match inputs | Product analytics | Tenant and entitlement service | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: record the hash at preview time, not at execution. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: in_app_ai_copilot_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: tool_call_validity_rate, type: double, nullable: false }
    - { name: task_success_rate, type: double, nullable: false }
    - { name: confirmation_acceptance, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Tool-call validity rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Task success rate against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Tool-call validity rate, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE in_app_ai_copilot_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE in_app_ai_copilot_steps (
  task_id TEXT NOT NULL REFERENCES in_app_ai_copilot_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE in_app_ai_copilot_approvals (
  task_id TEXT NOT NULL REFERENCES in_app_ai_copilot_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "In-App AI Copilot for SaaS Products": Let users accomplish tasks in the product through natural language, with the copilot calling product APIs safely on their behalf. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Support, success and the copilots that help them | Support teams answer tickets with help-centre articles and past replies; success managers prepare reviews for customers. Assistants draft replies, route tickets and summarise calls, with accuracy, tone and policy compliance as constraints. | Deflection that hides a wrong answer costs more than a ticket, so assistants must cite sources and escalate when unsure. |
| Data platforms, quality and ML operations | Data pipelines move events into warehouses; data quality checks catch schema and volume problems; ML platforms track models, drift, evaluation of language-model applications and costs. Gateways route requests between models by cost and quality. | Many model failures are data failures; monitoring inputs and outputs is as important as the model. |
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Tool-call validity rate | Calls passing schema validation. Reliability. | Leakage risk to design against: Schemas. |
| A signal-versus-noise trap in this use case: Authority | The true signal is execute with the user's scoped permissions; the common noise is service-account superuser. | A hijacked copilot must not exceed the user's rights. |

**Ask the experts**

- [ ] What exactly does "Respect user permissions" mean in practice for in-app ai copilot for saas products: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Tool-call validity rate" and "Task success rate", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Feature adoption via copilot" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: golden tasks too easy, and who can confirm the cut-off times and splits?
- [ ] How often does "Ambiguous request deletes the wrong object" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| In-app copilot | An assistant inside a product that answers questions and can take actions on the user's behalf. |
| Auth scope / OAuth | A permission granted to a token, and the standard protocol for delegated access. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| LLM gateway | A service that routes language-model requests between providers by cost, latency and quality. |
| Idempotency key | A unique value that makes a repeated request safe, so retries do not create duplicates. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Golden set | A fixed set of questions with verified answers used to score and compare versions of the system. |
| Knowledge base | The collection of help articles an assistant can retrieve and cite. |
| Text-to-SQL | Generating database queries from natural-language questions. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Token cost | The price of a model call, proportional to input and output tokens. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
