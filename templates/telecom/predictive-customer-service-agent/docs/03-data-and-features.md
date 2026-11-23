# Predictive Customer Service Agent: data and feature specification

> Generated from the blueprint `telecom/predictive-customer-service-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Customer Service Agent · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Predictive Customer Service Agent": Spot customers whose service is degrading, work out the cause from network and account data and act first with a fix, a credit or a message, so many problems are resolved before the customer contacts care. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Counting avoided calls without a control.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Experience score trend | change in per-customer throughput, drops and latency over 7 days | Early sign of harm | Join to the customer's serving cells |   |   |   |
| Cause attribution | whether degradation links to a cell fault, device or plan limit | Chooses the remedy | Needs network and device data |   |   |   |
| Prior contacts | contacts about the same issue in 30 days | Avoids repeats | From CRM as at action time |   |   |   |
| Customer value tier | plan and tenure band | Sets cost cap | Use bands not exact revenue |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Trigger | Measured service degradation tied to the customer | Any low score | Low scores include people who simply use little |
| Remedy | A fix matched to the cause with a cost cap | A generic apology credit | Credits train customers to complain and erode margin |
| Respect | Consent and contact preferences honoured | Maximum outreach | Over-contact increases churn |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer name | irrelevant and private |
| Handset colour | no link to service |
| Time since last bill | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Experience score trend inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: join to the customer's serving cells. |
| Cause attribution inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs network and device data. |
| Prior contacts inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from CRM as at action time. |
| Customer value tier inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use bands not exact revenue. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: predictive_customer_service_agent_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: experience_score_trend, type: double, nullable: false }
    - { name: cause_attribution, type: double, nullable: false }
    - { name: prior_contacts, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Experience score trend and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Cause attribution against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Experience score trend, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE predictive_customer_service_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE predictive_customer_service_steps (
  task_id TEXT NOT NULL REFERENCES predictive_customer_service_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE predictive_customer_service_approvals (
  task_id TEXT NOT NULL REFERENCES predictive_customer_service_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Predictive Customer Service Agent": Spot customers whose service is degrading, work out the cause from network and account data and act first with a fix, a credit or a message, so many problems are resolved before the customer contacts care. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Faults propagate through the network topology | A fault in one cell site, link or core node raises alarms on every element that depends on it. Operators correlate alarms along the topology (radio, backhaul, transport, core) to find the root cause instead of treating each alarm as a separate ticket. | Without topology awareness a model learns which alarms co-occur, not which element is broken, and field crews are dispatched to symptoms. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Experience score trend | Change in per-customer throughput, drops and latency over 7 days. Early sign of harm. | Leakage risk to design against: Join to the customer's serving cells. |
| A signal-versus-noise trap in this use case: Trigger | The true signal is measured service degradation tied to the customer; the common noise is any low score. | Low scores include people who simply use little. |

**Ask the experts**

- [ ] What exactly does "Actions limited to a catalogue of approved remedies with cost limits" mean in practice for predictive customer service agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Experience score trend" and "Cause attribution", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Contacts avoided per 1000 customers" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: counting avoided calls without a control, and who can confirm the cut-off times and splits?
- [ ] How often does "False degradation" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| ARPU | Average revenue per user: revenue divided by the number of subscribers in a period. |
| OSS | Operations support systems: the tools used to run the network, such as inventory, fault and performance management. |
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| Churn | The share of subscribers who leave in a period. |
| KPI | Key performance indicator: a measured value used to track cell or service health. |
| Handover | Moving an active session from one cell to another without dropping it. |
| SLA | Service level agreement: the availability or performance a provider commits to. |
| MTTR | Mean time to repair: the average time from fault to restored service. |
| SDN | Software-defined networking: separating control from forwarding so the network is programmable. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Latency budget | The time allowed for a response, split across retrieval, generation and checks. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| SHAP | A method for attributing a prediction to its features, based on Shapley values. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Token cost | The price of a model call, proportional to input and output tokens. |
