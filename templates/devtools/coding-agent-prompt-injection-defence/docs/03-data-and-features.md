# Coding Agent Prompt Injection Defence: data and feature specification

> Generated from the blueprint `devtools/coding-agent-prompt-injection-defence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Coding Agent Prompt Injection Defence · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Coding Agent Prompt Injection Defence": Detect and neutralise hostile instructions hidden in issues, code comments, dependencies and web pages that coding agents read, so untrusted text cannot steer the agent to leak data or run harmful commands. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Prompt-only defence.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Instruction-like text in data | commands inside files and web pages | Core | From the classifier |   |   |   |
| Tool risk tier | the tier of the tool being called | Approval | From policy |   |   |   |
| Data flow from untrusted source | whether untrusted text influences a call | Taint | From tracing |   |   |   |
| Egress and file write targets | where data is sent or written | Exfiltration | From the gateway |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Boundary | Policy enforced outside the model | A system prompt that asks the model to be careful | Prompts alone can be overridden |
| Test | Planted attacks in repositories and issues | Trust in vendor claims | Real attacks adapt |
| Impact | Limit the tools and data an agent can reach | Perfect detection | Detection will miss some attacks |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name | personal data |
| Repository name | an identifier |
| File extension alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Instruction-like text in data inputs | Developer experience | Source control and code review platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the classifier. |
| Tool risk tier inputs | Platform engineering | CI/CD and artifact registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from policy. |
| Data flow from untrusted source inputs | Application security | Issue tracker and developer portal | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from tracing. |
| Egress and file write targets inputs | Developer experience | Source control and code review platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the gateway. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: coding_agent_prompt_injection_defence_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: instruction_like_text_in_data, type: double, nullable: false }
    - { name: tool_risk_tier, type: double, nullable: false }
    - { name: data_flow_from_untrusted_source, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Instruction-like text in data and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Tool risk tier against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Instruction-like text in data, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Loghub system log collection | https://github.com/logpai/loghub | Research use (see the repository) | Real log datasets from distributed systems, supercomputers and applications | Labels are sparse and system-specific. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| CoNLL-2003 named entity recognition | https://huggingface.co/datasets/eriktks/conll2003 | Research use (see the page) | Newswire text tagged with person, organisation, location and miscellaneous entities | News text; short entity vocabulary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE coding_agent_prompt_injection_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE coding_agent_prompt_injection_steps (
  task_id TEXT NOT NULL REFERENCES coding_agent_prompt_injection_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE coding_agent_prompt_injection_approvals (
  task_id TEXT NOT NULL REFERENCES coding_agent_prompt_injection_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Coding Agent Prompt Injection Defence": Detect and neutralise hostile instructions hidden in issues, code comments, dependencies and web pages that coding agents read, so untrusted text cannot steer the agent to leak data or run harmful commands. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Coding agents act with the permissions you give them | Agents that read repositories and run commands can be steered by hostile text in files, issues and web pages. They need sandboxes, short-lived scoped credentials, egress limits and human approval for risky actions. | Controls belong in the platform, not in prompt instructions that an attacker can override. |
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Developer productivity is a team-level concept | Flow metrics such as lead time and deployment frequency describe a system. Used on individuals, they are gamed and harm trust. | Any measurement should be aggregated to teams and agreed with employee representatives where required. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Instruction-like text in data | Commands inside files and web pages. Core. | Leakage risk to design against: From the classifier. |
| A signal-versus-noise trap in this use case: Boundary | The true signal is policy enforced outside the model; the common noise is a system prompt that asks the model to be careful. | Prompts alone can be overridden. |

**Ask the experts**

- [ ] What exactly does "Untrusted text is separated from instructions" mean in practice for coding agent prompt injection defence: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Instruction-like text in data" and "Tool risk tier", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Blocked injection attempts" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: prompt-only defence, and who can confirm the cut-off times and splits?
- [ ] How often does "Hidden text" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prompt injection | Hostile instructions hidden in data that an AI system reads. |
| Monorepo | One repository holding many projects. |
| CI | Continuous integration: building and testing every change automatically. |
| Code review | Examination of a change by another engineer. |
| Test coverage | The share of code run by tests. |
| Test selection | Choosing which tests to run for a change. |
| Change failure rate | The share of deployments that cause a failure. |
| Reachability | Whether vulnerable code can actually be called. |
| Code owner | The team responsible for part of the code. |
| Sandbox | An isolated environment for running untrusted code. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
