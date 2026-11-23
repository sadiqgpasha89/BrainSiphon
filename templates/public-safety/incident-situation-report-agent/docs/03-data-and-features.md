# Incident Situation Report Agent: data and feature specification

> Generated from the blueprint `public-safety/incident-situation-report-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Incident Situation Report Agent · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Incident Situation Report Agent": Compile situation reports for incident commanders from radio logs, dispatch events, field reports and maps, with every statement linked to its source and the time. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Uncited statements.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Event timeline | ordered events with times | Spine | From CAD |   |   |   |
| Resource status | units and assets by status | Context | From CAD |   |   |   |
| Hazard and map layers | hazard extent and closures | Context | From GIS |   |   |   |
| Report conflict flags | disagreements between sources | Caution | From checks |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Time-stamped logs and reports | Model inference | Commanders need facts not guesses |
| Role | Compilation and summary | Decision making | Commanders decide |
| Freshness | Age shown for every item | A single snapshot | Situations change quickly |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Author name | irrelevant |
| Report length | weak link |
| Formatting | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Event timeline inputs | Emergency communications | Computer-aided dispatch (CAD) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from CAD. |
| Resource status inputs | Operations and investigations leadership | Records management and evidence systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from CAD. |
| Hazard and map layers inputs | Chief data and ethics officer | Court case management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from GIS. |
| Report conflict flags inputs | Emergency communications | Computer-aided dispatch (CAD) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from checks. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: incident_situation_report_agent_inputs.v1
owner: emergency-communications@example.com
system_of_record: Computer-aided dispatch (CAD)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: event_timeline, type: double, nullable: false }
    - { name: resource_status, type: double, nullable: false }
    - { name: hazard_and_map_layers, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Event timeline and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Resource status against Computer-aided dispatch (CAD)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Event timeline, traces back to Computer-aided dispatch (CAD); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE incident_situation_report_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE incident_situation_report_steps (
  task_id TEXT NOT NULL REFERENCES incident_situation_report_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE incident_situation_report_approvals (
  task_id TEXT NOT NULL REFERENCES incident_situation_report_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Public safety covers emergency calls, dispatch, disaster response, road safety, physical security and the courts. Seconds matter, errors cost lives or liberty, and the data describes people at their worst moments, so systems support trained professionals and are built with strict limits on identification, profiling and secondary use. For this use case, "Incident Situation Report Agent": Compile situation reports for incident commanders from radio logs, dispatch events, field reports and maps, with every statement linked to its source and the time. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Emergency calls are time-critical and noisy | Callers are distressed, speak different languages and describe locations poorly. Call-takers must capture the nature, location and risk fast, and every second before dispatch counts. | Tools should assist capture and triage, with the call-taker retaining authority to dispatch. |
| Records are sensitive and need strict retention | Incident, victim and witness records are among the most sensitive data a state holds. Access is logged, retention limits are enforced and data is shared only as the law allows. | Aggregated and de-identified data should be used for analytics wherever possible. |
| Dispatch is a resource allocation problem | Units differ in capability, position and availability, and demand is uneven across place and time. Good dispatch balances fast response with coverage for the next call. | Sending the nearest unit each time can leave an area uncovered, so coverage must be modelled. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Event timeline | Ordered events with times. Spine. | Leakage risk to design against: From CAD. |
| A signal-versus-noise trap in this use case: Source | The true signal is time-stamped logs and reports; the common noise is model inference. | Commanders need facts not guesses. |

**Ask the experts**

- [ ] What exactly does "Every statement cites a source and time" mean in practice for incident situation report agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Event timeline" and "Resource status", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to produce a sitrep" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: uncited statements, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflicting reports" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CAD | Computer-aided dispatch: the system used to record calls and assign units. |
| Incident command | A system for managing response at the scene. |
| False alarm | An alert with no real incident. |
| Triage | Sorting incidents by urgency. |
| Unit | A vehicle or team available for dispatch. |
| Situational awareness | Understanding what is happening and where. |
| Early warning | An alert sent before a hazard arrives. |
| Redaction | Removing sensitive text from a document. |
| Human in the loop | A person reviews or approves the system's output. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
