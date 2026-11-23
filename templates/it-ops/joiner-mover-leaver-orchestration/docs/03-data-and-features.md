# Joiner Mover Leaver Orchestration: data and feature specification

> Generated from the blueprint `it-ops/joiner-mover-leaver-orchestration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Joiner Mover Leaver Orchestration · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Joiner Mover Leaver Orchestration": Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Manager emails as triggers.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| HR event type and date | join, move or leave event | Trigger | From HR system |   |   |   |
| Role and department | target role | Entitlement | From HR and identity |   |   |   |
| Current entitlements | access held now | Delta | From identity systems |   |   |   |
| Device and licence assignments | assets assigned | Recovery | From asset records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Trigger | Authoritative HR events | Manager emails | Emails are late and incomplete |
| Control | Verification after each step | Assumed completion | Silent failures leave access open |
| Scope | Role-based bundles | Copying another person access | Copying spreads excess access |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Employee name | personal data |
| Manager comments | personal data |
| Ticket wording | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| HR event type and date inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from HR system. |
| Role and department inputs | Service management | Configuration management database | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from HR and identity. |
| Current entitlements inputs | Security operations | Monitoring, logging and cloud billing platforms | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from identity systems. |
| Device and licence assignments inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from asset records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: joiner_mover_leaver_orchestration_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: hr_event_type_and_date, type: double, nullable: false }
    - { name: role_and_department, type: double, nullable: false }
    - { name: current_entitlements, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on HR event type and date and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Role and department against IT service management platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as HR event type and date, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE joiner_mover_leaver_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE joiner_mover_leaver_steps (
  task_id TEXT NOT NULL REFERENCES joiner_mover_leaver_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE joiner_mover_leaver_approvals (
  task_id TEXT NOT NULL REFERENCES joiner_mover_leaver_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Joiner Mover Leaver Orchestration": Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Access changes are controlled | Joiners, movers and leavers need accounts, devices and access that match their role at all times. Over-privileged and orphaned accounts are common audit findings. | Automating access without approvals and separation of duties creates risk. |
| Service desks resolve repeat requests | Most tickets are password resets, access requests, device problems and how-to questions with known answers. Good knowledge and automation deflect them while keeping humans for complex cases. | Closing a chat without solving the problem looks like success in the numbers and fails the employee. |
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: HR event type and date | Join, move or leave event. Trigger. | Leakage risk to design against: From HR system. |
| A signal-versus-noise trap in this use case: Trigger | The true signal is authoritative HR events; the common noise is manager emails. | Emails are late and incomplete. |

**Ask the experts**

- [ ] What exactly does "Leaver access removed within 1 hour of the HR event" mean in practice for joiner mover leaver orchestration: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "HR event type and date" and "Role and department", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Orphaned accounts" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: manager emails as triggers, and who can confirm the cut-off times and splits?
- [ ] How often does "Late HR data" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| JML | Joiner, mover, leaver: the lifecycle of a person's access. |
| Break-glass | Emergency access that is logged and reviewed. |
| Privileged access | Powerful accounts that can change systems. |
| Recertification | Periodic review of who should keep access. |
| ITSM | IT service management: the practice and tools for managing IT services. |
| Change request | A proposal to change a production system. |
| CAB | Change advisory board: a group that reviews significant changes. |
| Telemetry | Data sent from systems about their state. |
| Separation of duties | Splitting a task so no one person can complete it alone. |
| SIEM | Security information and event management: a system that collects security events. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
