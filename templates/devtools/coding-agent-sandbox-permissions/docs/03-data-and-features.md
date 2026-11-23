# Coding Agent Sandbox and Permission Policy: data and feature specification

> Generated from the blueprint `devtools/coding-agent-sandbox-permissions` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Coding Agent Sandbox and Permission Policy · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Coding Agent Sandbox and Permission Policy": Run coding agents inside isolated sandboxes with least-privilege, short-lived credentials and egress controls so agents can build and test code but cannot reach production or exfiltrate data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Developer credentials for agents.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Sandbox policy compliance | whether commands stayed in policy | Safety | From logs |   |   |   |
| Token scope and lifetime | permissions and expiry | Risk | From the credential service |   |   |   |
| Egress attempts | blocked and allowed connections | Exfiltration signal | From network logs |   |   |   |
| Resource usage | CPU, memory and time | Abuse signal | From the sandbox |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Isolation | Disposable sandboxes per task | Developer laptops | A compromised session must not spread |
| Credentials | Short-lived scoped tokens | Long-lived personal tokens | Leaked tokens grant wide access |
| Network | Allow-listed egress | Open internet | Open egress allows exfiltration |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name | personal data |
| Task title wording | weak link |
| Repository name | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Sandbox policy compliance inputs | Developer experience | Source control and code review platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from logs. |
| Token scope and lifetime inputs | Platform engineering | CI/CD and artifact registry | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the credential service. |
| Egress attempts inputs | Application security | Issue tracker and developer portal | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from network logs. |
| Resource usage inputs | Developer experience | Source control and code review platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the sandbox. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: coding_agent_sandbox_permissions_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: sandbox_policy_compliance, type: double, nullable: false }
    - { name: token_scope_and_lifetime, type: double, nullable: false }
    - { name: egress_attempts, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Sandbox policy compliance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Token scope and lifetime against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Sandbox policy compliance, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Loghub system log collection | https://github.com/logpai/loghub | Research use (see the repository) | Real log datasets from distributed systems, supercomputers and applications | Labels are sparse and system-specific. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE coding_agent_sandbox_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE coding_agent_sandbox_steps (
  task_id TEXT NOT NULL REFERENCES coding_agent_sandbox_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE coding_agent_sandbox_approvals (
  task_id TEXT NOT NULL REFERENCES coding_agent_sandbox_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Coding Agent Sandbox and Permission Policy": Run coding agents inside isolated sandboxes with least-privilege, short-lived credentials and egress controls so agents can build and test code but cannot reach production or exfiltrate data. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Coding agents act with the permissions you give them | Agents that read repositories and run commands can be steered by hostile text in files, issues and web pages. They need sandboxes, short-lived scoped credentials, egress limits and human approval for risky actions. | Controls belong in the platform, not in prompt instructions that an attacker can override. |
| Deployments carry risk that can be staged | Canaries, progressive rollouts and feature flags limit the damage of a bad release. The risk depends on change size, service criticality and timing. | Gating decisions should be policy with model input and not a model alone. |
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Survival, censoring and time-to-event | When outcomes happen over time and many units have not yet had the event, ignoring the censoring biases rates downward. Survival and hazard models use the partial information of censored cases. | Dropping open accounts or treating them as non-events is the most common source of optimistic risk estimates. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Sandbox policy compliance | Whether commands stayed in policy. Safety. | Leakage risk to design against: From logs. |
| A signal-versus-noise trap in this use case: Isolation | The true signal is disposable sandboxes per task; the common noise is developer laptops. | A compromised session must not spread. |

**Ask the experts**

- [ ] What exactly does "Agents have no production credentials" mean in practice for coding agent sandbox and permission policy: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Sandbox policy compliance" and "Token scope and lifetime", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Agent sessions without incidents" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: developer credentials for agents, and who can confirm the cut-off times and splits?
- [ ] How often does "Prompt injection in a repository" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Prompt injection | Hostile instructions hidden in data that an AI system reads. |
| Sandbox | An isolated environment for running untrusted code. |
| Least privilege | Giving only the access needed for a task. |
| Monorepo | One repository holding many projects. |
| Secret scanning | Searching code and logs for exposed credentials. |
| CI | Continuous integration: building and testing every change automatically. |
| Code review | Examination of a change by another engineer. |
| Test coverage | The share of code run by tests. |
| Change failure rate | The share of deployments that cause a failure. |
| Lead time | The time from commit to production. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
