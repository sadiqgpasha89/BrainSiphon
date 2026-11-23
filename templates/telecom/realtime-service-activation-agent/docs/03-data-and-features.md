# Real-Time Service Activation Agent: data and feature specification

> Generated from the blueprint `telecom/realtime-service-activation-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Service Activation Agent · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Real-Time Service Activation Agent": Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Retrying without idempotency.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Eligibility check result | pass or fail of coverage, credit and contract rules | Stops invalid orders early | Rules owned by product teams |   |   |   |
| Dependency state | status of upstream orders and resources the service needs | Predicts a stuck order | Needs live order state |   |   |   |
| Step latency history | median and p95 time of each provisioning step | Spots a slow system | Per system and per hour |   |   |   |
| Customer consent record | consent and contract acceptance flags | Legal gate | From the consent store at action time |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Scope | A catalogue of orderable services with eligibility rules | Free-form requests turned into network changes | Free-form changes bypass product and billing controls |
| Sequence | Ordered, idempotent steps with checkpoints | One bulk call to all systems | A half-finished activation leaves billing and network out of step |
| Exceptions | A small set of typed failure classes with owners | Retry everything | Blind retries create duplicate charges and orders |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Order submission channel | does not change provisioning |
| Customer name | irrelevant and private |
| Sales agent identifier | irrelevant to activation |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Eligibility check result inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: rules owned by product teams. |
| Dependency state inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs live order state. |
| Step latency history inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: per system and per hour. |
| Customer consent record inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the consent store at action time. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: realtime_service_activation_agent_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: eligibility_check_result, type: double, nullable: false }
    - { name: dependency_state, type: double, nullable: false }
    - { name: step_latency_history, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Eligibility check result and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Dependency state against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Eligibility check result, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE realtime_service_activation_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE realtime_service_activation_steps (
  task_id TEXT NOT NULL REFERENCES realtime_service_activation_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE realtime_service_activation_approvals (
  task_id TEXT NOT NULL REFERENCES realtime_service_activation_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Real-Time Service Activation Agent": Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Provisioning turns an order into a working service | Activation spans order capture, inventory, number and SIM assignment, network configuration and billing set-up across OSS and BSS systems. Failures often come from data mismatches between those systems. | Fall-out in the middle of a multi-system flow leaves a paying customer without service, so orders need compensating steps and clear status. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Eligibility check result | Pass or fail of coverage, credit and contract rules. Stops invalid orders early. | Leakage risk to design against: Rules owned by product teams. |
| A signal-versus-noise trap in this use case: Scope | The true signal is a catalogue of orderable services with eligibility rules; the common noise is free-form requests turned into network changes. | Free-form changes bypass product and billing controls. |

**Ask the experts**

- [ ] What exactly does "The agent works only from the product catalogue and approved order templates" mean in practice for real-time service activation agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Eligibility check result" and "Dependency state", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to activate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: retrying without idempotency, and who can confirm the cut-off times and splits?
- [ ] How often does "Downstream system timeout" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Provisioning | Configuring the network and systems so a purchased service works. |
| Order fall-out | An order that fails part way through a multi-system flow. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| SLA | Service level agreement: the availability or performance a provider commits to. |
| SDN | Software-defined networking: separating control from forwarding so the network is programmable. |
| Rating | Applying tariffs to usage records to calculate charges. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
