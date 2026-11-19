# Incident Response Playbook Agent: data and feature specification

> Generated from the blueprint `cybersecurity/incident-response-playbook-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Incident Response Playbook Agent · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Incident Response Playbook Agent": Execute and adapt incident-response playbooks (contain, collect, notify) with human approval gates for destructive actions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Replay incidents lacking messy reality.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Action risk tier | read, reversible, destructive | Gate | Classification |   |   |   |
| Precondition checks | state verified before action | Safety | Tool checks |   |   |   |
| Rollback availability | action has rollback | Risk | Metadata |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Safety | Action risk tiers with approvals | Fully autonomous containment | A wrong isolation can take down production |
| Determinism | Playbook steps as typed tools with preconditions | Free-form commands | Free-form commands are unauditable |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Agent narrative | none |
| Number of steps | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Action risk tier inputs | Detection engineering | SIEM and security data lake | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: classification. |
| Precondition checks inputs | Security data platform | Asset inventory (CMDB) and identity directory | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: tool checks. |
| Rollback availability inputs | Identity and access team | Case and ticketing system (SOAR) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: metadata. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: incident_response_playbook_agent_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: action_risk_tier, type: double, nullable: false }
    - { name: precondition_checks, type: double, nullable: false }
    - { name: rollback_availability, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Action risk tier and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Precondition checks against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Action risk tier, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE incident_response_playbook_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE incident_response_playbook_steps (
  task_id TEXT NOT NULL REFERENCES incident_response_playbook_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE incident_response_playbook_approvals (
  task_id TEXT NOT NULL REFERENCES incident_response_playbook_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Incident Response Playbook Agent": Execute and adapt incident-response playbooks (contain, collect, notify) with human approval gates for destructive actions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Evidence and context | Decisions rest on logs (process, authentication, network, DNS), threat intelligence about addresses and files, asset criticality, and identity context such as whether a user is travelling. Logs have retention limits, clock differences and gaps, and the same behaviour can be malicious or benign depending on context, for example encoded PowerShell from a document versus from a management agent. | An agent that cannot get the deciding evidence must say so and escalate, not infer. |
| Securing AI systems themselves | Machine-learning models can be attacked: adversarial inputs, data poisoning, model extraction, prompt injection and over-permissioned agents. Defences include robustness training, rate limits and monitoring, input and output filters, and strict tool permissions. | Any model that reads untrusted input or can take actions needs its own threat model and tests. |
| The SOC workflow and its tools | Detections come from a SIEM (collects and correlates logs), EDR (monitors endpoints) and other sensors. Analysts triage the alert, investigate by querying logs and context, and escalate or close it; responders contain and remediate. SOAR tools automate fixed playbooks. Teams measure mean time to detect and respond, and the queue never empties. | The agent has to fit this process, speak its vocabulary and leave an audit trail analysts and auditors can follow. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Action risk tier | Read, reversible, destructive. Gate. | Leakage risk to design against: Classification. |
| A signal-versus-noise trap in this use case: Safety | The true signal is action risk tiers with approvals; the common noise is fully autonomous containment. | A wrong isolation can take down production. |

**Ask the experts**

- [ ] What exactly does "Destructive actions need approval" mean in practice for incident response playbook agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Action risk tier" and "Precondition checks", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mean time to contain" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: replay incidents lacking messy reality, and who can confirm the cut-off times and splits?
- [ ] How often does "Misidentified host leads to isolation of a production server" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Playbook (SOAR) | A scripted sequence of response steps that a SOAR platform can run. |
| SOAR | Security orchestration, automation and response: tools that run scripted playbooks for alerts. |
| Containment | Actions that limit an attack's spread, such as isolating a host or disabling an account. |
| SIEM | Security information and event management: a platform that collects, correlates and searches security logs. |
| EDR | Endpoint detection and response: software on devices that records activity and can isolate a host. |
| IOC | Indicator of compromise: an observable such as an IP address, file hash or domain linked to malicious activity. |
| TTP | Tactics, techniques and procedures: how an attacker operates, more durable than a single indicator. |
| MITRE ATT&CK | A public knowledge base of adversary tactics and techniques used to describe and label detections. |
| C2 / beaconing | Command and control traffic, often a compromised host contacting an attacker's server at regular intervals. |
| Lateral movement | An attacker moving from one compromised system to others inside the network. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Model registry | A versioned store of models with metadata, used for promotion and rollback. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
