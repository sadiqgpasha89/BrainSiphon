# On-Call Runbook Assistant: data and feature specification

> Generated from the blueprint `it-ops/on-call-runbook-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** On-Call Runbook Assistant · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "On-Call Runbook Assistant": Find the right runbook for an alert, summarise the steps in context and answer questions during an incident, with links to the source and no actions taken without approval. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model memory of procedures.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Alert and service match | runbooks linked to the alert | Retrieval | From the catalogue |   |   |   |
| Runbook freshness | last review date | Trust | From the doc system |   |   |   |
| Step applicability | environment and version conditions | Filtering | From runbook metadata |   |   |   |
| Past usage outcomes | whether a runbook helped before | Ranking | From incident records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Current runbooks and service docs | Model memory | Procedures change |
| Role | Guide the responder | Execute steps | Execution needs approval and context |
| Quality | Freshness flags | Unversioned copies | Outdated steps cause harm |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Responder name | personal data |
| Page length | weak link |
| Chat history length | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Alert and service match inputs | Infrastructure and operations | IT service management platform | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the catalogue. |
| Runbook freshness inputs | Service management | Configuration management database | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the doc system. |
| Step applicability inputs | Security operations | Monitoring, logging and cloud billing platforms | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from runbook metadata. |
| Past usage outcomes inputs | Infrastructure and operations | IT service management platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from incident records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: on_call_runbook_assistant_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: alert_and_service_match, type: double, nullable: false }
    - { name: runbook_freshness, type: double, nullable: false }
    - { name: step_applicability, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Alert and service match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Runbook freshness against IT service management platform
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Alert and service match, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE on_call_runbook_assistant_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE on_call_runbook_assistant_steps (
  task_id TEXT NOT NULL REFERENCES on_call_runbook_assistant_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE on_call_runbook_assistant_approvals (
  task_id TEXT NOT NULL REFERENCES on_call_runbook_assistant_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "On-Call Runbook Assistant": Find the right runbook for an alert, summarise the steps in context and answer questions during an incident, with links to the source and no actions taken without approval. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Alerts are mostly noise | Monitoring tools raise thousands of alerts, many duplicate or symptoms of one fault. Grouping alerts by topology and time into incidents reduces pages and speeds diagnosis. | Suppressing alerts without visibility can hide a real outage, so grouped alerts must stay inspectable. |
| Incidents are solved from evidence | Responders compare metrics, logs, traces and recent changes to find the cause. Many incidents follow a change, so change records are strong evidence. | A diagnosis that does not cite its evidence cannot be tested by the commander. |
| Service desks resolve repeat requests | Most tickets are password resets, access requests, device problems and how-to questions with known answers. Good knowledge and automation deflect them while keeping humans for complex cases. | Closing a chat without solving the problem looks like success in the numbers and fails the employee. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Alert and service match | Runbooks linked to the alert. Retrieval. | Leakage risk to design against: From the catalogue. |
| A signal-versus-noise trap in this use case: Source | The true signal is current runbooks and service docs; the common noise is model memory. | Procedures change. |

**Ask the experts**

- [ ] What exactly does "Answers cite the runbook version and section" mean in practice for on-call runbook assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Alert and service match" and "Runbook freshness", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to find a runbook" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: model memory of procedures, and who can confirm the cut-off times and splits?
- [ ] How often does "No runbook" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Runbook | A documented procedure for handling a known situation. |
| Problem record | A record of the underlying cause of one or more incidents. |
| Change request | A proposal to change a production system. |
| ITSM | IT service management: the practice and tools for managing IT services. |
| Incident | An unplanned interruption or reduction in service quality. |
| CAB | Change advisory board: a group that reviews significant changes. |
| MTTD | Mean time to detect a problem. |
| On-call | A rota of people responsible for responding to alerts. |
| Postmortem | A blameless review after an incident. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Context window | The maximum amount of text a model can read at once. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
