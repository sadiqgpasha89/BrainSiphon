# DevTools Agent Action Guardrails: data and feature specification

> Generated from the blueprint `devtools/devtools-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DevTools Agent Action Guardrails · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "DevTools Agent Action Guardrails": Control every action AI coding agents take in source repositories, build pipelines and package registries, enforce approval tiers and give security reviewers a replayable record of each change. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Prompt-only restrictions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Protected-branch touch attempts | writes aimed at main, release and tag refs | Tier routing | Source host events |   |   |   |
| Pushes per agent per hour | push volume against the agent baseline | Runaway loop detection | Per agent token |   |   |   |
| Reviewer overrides on agent pull requests | forced merges and skipped checks | Governance health | Pull request metadata |   |   |   |
| Pipeline result after agent change | whether build and tests passed afterwards | Quality of agent changes | CI results |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Enforcement | Branch rules and token scopes held in the source host | Instructions in the agent prompt | A crafted issue comment can override prompt text |
| Scope | One short-lived token per agent and repository | A shared organisation access token | A bad push should not reach every repository |
| Evidence | Signed commit and pipeline event ledger | Chat transcripts of the agent | Reviewers need the exact diff and the exact pipeline run |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Branch name prefix | a label only |
| Commit message length | not risk |
| Agent framework version alone | needs outcome data |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Protected-branch touch attempts inputs | Developer experience | Source control and code review platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: source host events. |
| Pushes per agent per hour inputs | Platform engineering | CI/CD and artifact registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: per agent token. |
| Reviewer overrides on agent pull requests inputs | Application security | Issue tracker and developer portal | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: pull request metadata. |
| Pipeline result after agent change inputs | Developer experience | Source control and code review platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: CI results. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: devtools_agent_action_guardrails_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: protected_branch_touch_attempts, type: double, nullable: false }
    - { name: pushes_per_agent_per_hour, type: double, nullable: false }
    - { name: reviewer_overrides_on_agent_pull, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Protected-branch touch attempts and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Pushes per agent per hour against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Protected-branch touch attempts, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE devtools_agent_action_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE devtools_agent_action_steps (
  task_id TEXT NOT NULL REFERENCES devtools_agent_action_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE devtools_agent_action_approvals (
  task_id TEXT NOT NULL REFERENCES devtools_agent_action_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "DevTools Agent Action Guardrails": Control every action AI coding agents take in source repositories, build pipelines and package registries, enforce approval tiers and give security reviewers a replayable record of each change. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Coding agents act with the permissions you give them | Agents that read repositories and run commands can be steered by hostile text in files, issues and web pages. They need sandboxes, short-lived scoped credentials, egress limits and human approval for risky actions. | Controls belong in the platform, not in prompt instructions that an attacker can override. |
| Tests are slow, flaky and unevenly useful | Large suites take hours and some tests fail without a code cause. Selecting and ordering tests by their chance of catching a regression saves time, but only if flaky tests are separated from real failures. | Skipping tests to save time moves risk to production. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Protected-branch touch attempts | Writes aimed at main, release and tag refs. Tier routing. | Leakage risk to design against: Source host events. |
| A signal-versus-noise trap in this use case: Enforcement | The true signal is branch rules and token scopes held in the source host; the common noise is instructions in the agent prompt. | A crafted issue comment can override prompt text. |

**Ask the experts**

- [ ] What exactly does "Branch protection and registry write rules enforced by a gateway the agent cannot edit" mean in practice for devtools agent action guardrails: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Protected-branch touch attempts" and "Pushes per agent per hour", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Unsafe pushes stopped at the gateway" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: prompt-only restrictions, and who can confirm the cut-off times and splits?
- [ ] How often does "Push loop" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pull request | A proposed code change submitted for review. |
| CI | Continuous integration: building and testing every change automatically. |
| Code review | Examination of a change by another engineer. |
| Commit | A saved change to the code base. |
| Lead time | The time from commit to production. |
| Prompt injection | Hostile instructions hidden in data that an AI system reads. |
| Monorepo | One repository holding many projects. |
| Test coverage | The share of code run by tests. |
| Change failure rate | The share of deployments that cause a failure. |
| Code owner | The team responsible for part of the code. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Canary release | Exposing a new model to a small share of traffic first, with automatic rollback on guardrail metrics. |
| Guardrail metric | A metric that must not get worse when optimising the main objective. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
