# Access Request Fulfilment Agent: data and feature specification

> Generated from the blueprint `it-ops/access-request-fulfilment-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Access Request Fulfilment Agent · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Access Request Fulfilment Agent": Handle routine access requests by checking policy and role, routing approvals and provisioning low-risk access through workflow, with a full audit record. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Agent-granted privileged access.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Role and entitlement match | whether the role allows the access | Core | From the directory |   |   |   |
| Risk tier of the target | sensitivity of the system | Routing | From the catalogue |   |   |   |
| Existing access | what the user already holds | Conflict checks | From identity systems |   |   |   |
| Approval state | whether approvers agreed | Gate | From workflow |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Policy | Role-based access rules | Free-form approval | Manual exceptions weaken control |
| Scope | Low-risk standard access | Privileged or sensitive access | These need human decisions |
| Evidence | An audit record per request | A chat transcript | Auditors need structured records |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Requester name | personal data |
| Request wording | weak link |
| Time of day | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Role and entitlement match inputs | Infrastructure and operations | IT service management platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the directory. |
| Risk tier of the target inputs | Service management | Configuration management database | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the catalogue. |
| Existing access inputs | Security operations | Monitoring, logging and cloud billing platforms | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from identity systems. |
| Approval state inputs | Infrastructure and operations | IT service management platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from workflow. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: access_request_fulfilment_agent_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: role_and_entitlement_match, type: double, nullable: false }
    - { name: risk_tier_of_the_target, type: double, nullable: false }
    - { name: existing_access, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Role and entitlement match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Risk tier of the target against IT service management platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Role and entitlement match, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE access_request_fulfilment_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE access_request_fulfilment_steps (
  task_id TEXT NOT NULL REFERENCES access_request_fulfilment_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE access_request_fulfilment_approvals (
  task_id TEXT NOT NULL REFERENCES access_request_fulfilment_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Access Request Fulfilment Agent": Handle routine access requests by checking policy and role, routing approvals and provisioning low-risk access through workflow, with a full audit record. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Access changes are controlled | Joiners, movers and leavers need accounts, devices and access that match their role at all times. Over-privileged and orphaned accounts are common audit findings. | Automating access without approvals and separation of duties creates risk. |
| Service desks resolve repeat requests | Most tickets are password resets, access requests, device problems and how-to questions with known answers. Good knowledge and automation deflect them while keeping humans for complex cases. | Closing a chat without solving the problem looks like success in the numbers and fails the employee. |
| Changes cause most incidents | Releases, configuration changes and patches are the main cause of outages. Risk-based change management, configuration baselines and staged rollouts reduce harm. | Drift between declared and actual configuration hides risk until something fails. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Role and entitlement match | Whether the role allows the access. Core. | Leakage risk to design against: From the directory. |
| A signal-versus-noise trap in this use case: Policy | The true signal is role-based access rules; the common noise is free-form approval. | Manual exceptions weaken control. |

**Ask the experts**

- [ ] What exactly does "Provisioning only after required approvals" mean in practice for access request fulfilment agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Role and entitlement match" and "Risk tier of the target", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Fulfilment time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: agent-granted privileged access, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflicting duties" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Separation of duties | Splitting a task so no one person can complete it alone. |
| Recertification | Periodic review of who should keep access. |
| Change request | A proposal to change a production system. |
| Break-glass | Emergency access that is logged and reviewed. |
| Privileged access | Powerful accounts that can change systems. |
| ITSM | IT service management: the practice and tools for managing IT services. |
| ITIL | A framework of IT service management practices. |
| SLO | Service level objective: a target for a service measure. |
| Telemetry | Data sent from systems about their state. |
| JML | Joiner, mover, leaver: the lifecycle of a person's access. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Target encoding | Replacing a category by the average outcome for that category, which leaks unless done carefully. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
