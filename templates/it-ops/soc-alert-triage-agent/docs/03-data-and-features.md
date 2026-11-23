# SOC Alert Triage Agent: data and feature specification

> Generated from the blueprint `it-ops/soc-alert-triage-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SOC Alert Triage Agent · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "SOC Alert Triage Agent": Enrich and triage security alerts by gathering context from identity, endpoint and network data, ranking them and drafting an investigation summary for the analyst to confirm. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Tool severity as truth.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Alert rule fidelity | past true positive rate of the rule | Prior | From SIEM history |   |   |   |
| Asset criticality | value of the affected asset | Impact | From the CMDB |   |   |   |
| Entity history | whether similar behaviour is normal | Context | From logs |   |   |   |
| Threat intelligence match | indicators seen elsewhere | Strength | From threat feeds |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Label | Analyst dispositions after investigation | Alert severity from the tool | Severities are often wrong |
| Role | Enrich and rank | Contain automatically | Wrong containment disrupts business |
| Evidence | Linked logs and entity history | A narrative | Narratives can be plausible and wrong |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Analyst name | personal data |
| Alert id | an identifier |
| Tool vendor | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Alert rule fidelity inputs | Infrastructure and operations | IT service management platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from SIEM history. |
| Asset criticality inputs | Service management | Configuration management database | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the CMDB. |
| Entity history inputs | Security operations | Monitoring, logging and cloud billing platforms | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from logs. |
| Threat intelligence match inputs | Infrastructure and operations | IT service management platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from threat feeds. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: soc_alert_triage_agent_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: alert_rule_fidelity, type: double, nullable: false }
    - { name: asset_criticality, type: double, nullable: false }
    - { name: entity_history, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Alert rule fidelity and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Asset criticality against IT service management platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Alert rule fidelity, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE soc_alert_triage_agent_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE soc_alert_triage_agent_steps (
  task_id TEXT NOT NULL REFERENCES soc_alert_triage_agent_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE soc_alert_triage_agent_approvals (
  task_id TEXT NOT NULL REFERENCES soc_alert_triage_agent_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "SOC Alert Triage Agent": Enrich and triage security alerts by gathering context from identity, endpoint and network data, ranking them and drafting an investigation summary for the analyst to confirm. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Security operations is a triage problem | Security tools raise far more alerts than analysts can read. Context from identity, endpoint and network data decides which alerts matter, and containment is a human decision. | Automatic containment on a wrong alert can stop the business. |
| Access changes are controlled | Joiners, movers and leavers need accounts, devices and access that match their role at all times. Over-privileged and orphaned accounts are common audit findings. | Automating access without approvals and separation of duties creates risk. |
| Alerts are mostly noise | Monitoring tools raise thousands of alerts, many duplicate or symptoms of one fault. Grouping alerts by topology and time into incidents reduces pages and speeds diagnosis. | Suppressing alerts without visibility can hide a real outage, so grouped alerts must stay inspectable. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Alert rule fidelity | Past true positive rate of the rule. Prior. | Leakage risk to design against: From SIEM history. |
| A signal-versus-noise trap in this use case: Label | The true signal is analyst dispositions after investigation; the common noise is alert severity from the tool. | Severities are often wrong. |

**Ask the experts**

- [ ] What exactly does "Every summary cites the evidence gathered" mean in practice for soc alert triage agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Alert rule fidelity" and "Asset criticality", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mean time to triage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: tool severity as truth, and who can confirm the cut-off times and splits?
- [ ] How often does "Novel attack" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| SOC | Security operations centre: the team that monitors security events. |
| SIEM | Security information and event management: a system that collects security events. |
| CMDB | Configuration management database: records of IT assets and their relationships. |
| Configuration item | A component such as a server or application tracked in the CMDB. |
| On-call | A rota of people responsible for responding to alerts. |
| Runbook | A documented procedure for handling a known situation. |
| Postmortem | A blameless review after an incident. |
| Telemetry | Data sent from systems about their state. |
| Alert storm | A burst of many related alerts. |
| Privileged access | Powerful accounts that can change systems. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Isotonic regression | A monotone, non-parametric mapping used to calibrate scores. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
