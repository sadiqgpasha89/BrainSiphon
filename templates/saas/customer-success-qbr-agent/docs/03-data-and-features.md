# Customer Success QBR & Account Briefing Agent: data and feature specification

> Generated from the blueprint `saas/customer-success-qbr-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Success QBR & Account Briefing Agent · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Customer Success QBR & Account Briefing Agent": Generate account briefs and quarterly business review drafts from usage, support, billing and CRM data with cited metrics. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judging fluency over accuracy.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Metric citation coverage | statements linked to queries | Trust | Citation check |   |   |   |
| Insight relevance | CSM-rated usefulness | Quality | Feedback |   |   |   |
| Data freshness | age of source data | Reliability | Metadata |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Numbers | Metrics computed by queries and cited | LLM-stated figures | LLMs fabricate numbers |
| Insight | Highlight changes and risks with comparisons | List all metrics | Customers want what changed and what to do |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Slide design | cosmetic |
| Brief length | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Metric citation coverage inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: citation check. |
| Insight relevance inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: feedback. |
| Data freshness inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: metadata. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: customer_success_qbr_agent_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: metric_citation_coverage, type: double, nullable: false }
    - { name: insight_relevance, type: double, nullable: false }
    - { name: data_freshness, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Metric citation coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Insight relevance against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Metric citation coverage, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE customer_success_qbr_agent_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE customer_success_qbr_agent_steps (
  task_id TEXT NOT NULL REFERENCES customer_success_qbr_agent_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE customer_success_qbr_agent_approvals (
  task_id TEXT NOT NULL REFERENCES customer_success_qbr_agent_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Customer Success QBR & Account Briefing Agent": Generate account briefs and quarterly business review drafts from usage, support, billing and CRM data with cited metrics. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Support, success and the copilots that help them | Support teams answer tickets with help-centre articles and past replies; success managers prepare reviews for customers. Assistants draft replies, route tickets and summarise calls, with accuracy, tone and policy compliance as constraints. | Deflection that hides a wrong answer costs more than a ticket, so assistants must cite sources and escalate when unsure. |
| Identity resolution and the customer data platform | Customer data platforms merge records from many sources into one profile. Matching leads to accounts, cleaning duplicates and resolving identities are entity-resolution problems with strict privacy rules. | A wrong merge combines two real customers, with privacy consequences, so precision comes before recall. |
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Metric citation coverage | Statements linked to queries. Trust. | Leakage risk to design against: Citation check. |
| A signal-versus-noise trap in this use case: Numbers | The true signal is metrics computed by queries and cited; the common noise is lLM-stated figures. | LLMs fabricate numbers. |

**Ask the experts**

- [ ] What exactly does "Numbers from tools not the model" mean in practice for customer success qbr & account briefing agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Metric citation coverage" and "Insight relevance", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "CSM prep time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: judging fluency over accuracy, and who can confirm the cut-off times and splits?
- [ ] How often does "Data from different systems disagree" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| QBR | Quarterly business review: a meeting where a customer success manager reviews value delivered with a customer. |
| Churn | Customers or revenue lost over a period; logo churn counts accounts, revenue churn counts money. |
| Renewal | The point at which a customer decides whether to continue a subscription. |
| Expansion / upsell | Revenue growth from existing customers buying more seats, features or tiers. |
| Usage-based billing | Charging according to consumption, such as API calls or storage, which makes revenue less predictable. |
| Runbook | A documented procedure for handling a known operational situation. |
| CDP | Customer data platform: a system that unifies customer data from many sources into profiles. |
| Entity resolution | Deciding which records refer to the same real-world entity. |
| In-app copilot | An assistant inside a product that answers questions and can take actions on the user's behalf. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
