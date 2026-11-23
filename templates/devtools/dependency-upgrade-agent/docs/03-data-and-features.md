# Dependency Upgrade Agent: data and feature specification

> Generated from the blueprint `devtools/dependency-upgrade-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dependency Upgrade Agent · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Dependency Upgrade Agent": Propose dependency upgrades that fix vulnerabilities and age, run tests in a sandbox and open pull requests with the changelog risks, for owners to merge. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Version bump bots with no tests.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Vulnerability fixed | advisories resolved by the update | Priority | From advisories |   |   |   |
| Semantic version change | patch, minor or major | Risk | From metadata |   |   |   |
| Test pass result | test outcomes after the change | Gate | From CI |   |   |   |
| Usage of changed APIs | calls to changed functions | Impact | From code analysis |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Safety | Tests and staged rollout | Version bump alone | Updates can break behaviour |
| Scope | Grouped small updates | One huge update | Large updates are hard to review |
| Evidence | Changelog and API diff | A version number | Owners need the risk |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Developer name | personal data |
| Package popularity alone | weak link |
| Branch name | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Vulnerability fixed inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from advisories. |
| Semantic version change inputs | Platform engineering | CI/CD and artifact registry | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from metadata. |
| Test pass result inputs | Application security | Issue tracker and developer portal | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from CI. |
| Usage of changed APIs inputs | Developer experience | Source control and code review platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from code analysis. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: dependency_upgrade_agent_inputs.v1
owner: developer-experience@example.com
system_of_record: Source control and code review platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: vulnerability_fixed, type: double, nullable: false }
    - { name: semantic_version_change, type: double, nullable: false }
    - { name: test_pass_result, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Vulnerability fixed and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Semantic version change against Source control and code review platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Vulnerability fixed, traces back to Source control and code review platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE dependency_upgrade_agent_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE dependency_upgrade_agent_steps (
  task_id TEXT NOT NULL REFERENCES dependency_upgrade_agent_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE dependency_upgrade_agent_approvals (
  task_id TEXT NOT NULL REFERENCES dependency_upgrade_agent_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Software engineering produces its own data: commits, reviews, builds, tests, incidents and tickets. Quality shows up late and noisily, developers are sensitive to being measured and code, secrets and customer data are among a company's most confidential assets, so tools assist engineers inside sandboxes and leave merges and releases to people. For this use case, "Dependency Upgrade Agent": Propose dependency upgrades that fix vulnerabilities and age, run tests in a sandbox and open pull requests with the changelog risks, for owners to merge. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Code review is a quality gate and a learning channel | Reviewers catch defects, share knowledge and keep designs consistent. Their time is limited, so tools that point to risky changes or likely issues help most when they cite evidence and leave the decision to the reviewer. | Tools that comment on everything teach reviewers to ignore them. |
| Deployments carry risk that can be staged | Canaries, progressive rollouts and feature flags limit the damage of a bad release. The risk depends on change size, service criticality and timing. | Gating decisions should be policy with model input and not a model alone. |
| Tests are slow, flaky and unevenly useful | Large suites take hours and some tests fail without a code cause. Selecting and ordering tests by their chance of catching a regression saves time, but only if flaky tests are separated from real failures. | Skipping tests to save time moves risk to production. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Vulnerability fixed | Advisories resolved by the update. Priority. | Leakage risk to design against: From advisories. |
| A signal-versus-noise trap in this use case: Safety | The true signal is tests and staged rollout; the common noise is version bump alone. | Updates can break behaviour. |

**Ask the experts**

- [ ] What exactly does "Each upgrade is a pull request with passing tests" mean in practice for dependency upgrade agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Vulnerability fixed" and "Semantic version change", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to fix vulnerable dependencies" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: version bump bots with no tests, and who can confirm the cut-off times and splits?
- [ ] How often does "Breaking API" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pull request | A proposed code change submitted for review. |
| Code review | Examination of a change by another engineer. |
| Commit | A saved change to the code base. |
| Regression | A defect introduced by a change to previously working behaviour. |
| Test selection | Choosing which tests to run for a change. |
| Change failure rate | The share of deployments that cause a failure. |
| Reachability | Whether vulnerable code can actually be called. |
| Dependency pinning | Fixing exact versions of dependencies. |
| Service catalogue | A list of services with owners and dependencies. |
| Sandbox | An isolated environment for running untrusted code. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Shadow mode | Running a new model on live traffic without acting on its output, to compare it with the current system. |
| Golden set | A fixed set of questions with verified answers used to score versions of a system. |
