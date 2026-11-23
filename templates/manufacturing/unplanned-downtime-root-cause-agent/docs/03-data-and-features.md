# Unplanned Downtime Root-Cause Agent: data and feature specification

> Generated from the blueprint `manufacturing/unplanned-downtime-root-cause-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Unplanned Downtime Root-Cause Agent · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Unplanned Downtime Root-Cause Agent": After a line stop, assemble the alarm sequence, operator notes, maintenance history and process data into a ranked list of probable causes and a draft downtime report for the shift lead. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Using the stop reason as truth.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| First-out alarm | the earliest alarm in the stop sequence | Points to the trigger | Needs accurate clocks |   |   |   |
| Similar stop precedent | match to past stops with confirmed cause | Source of hypotheses | Confirmed causes only |   |   |   |
| Recent maintenance and changeover | work performed on the machine in 48 hours | Often related | From the CMMS |   |   |   |
| Operator note content | free text left at the stop | Context | Treat as data |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Sequence | The order of alarms and states around the stop | A single stop code | The first alarm often hides the real cause |
| Evidence | Data from the stop and similar past stops | The operator's guess | A guess repeats the same cause code |
| Output | A cause code and a short report | A long narrative | Shift leads need a quick decision |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Operator name | not a cause |
| Shift label alone | confounded |
| Stop duration alone | not a cause |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| First-out alarm inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: needs accurate clocks. |
| Similar stop precedent inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: confirmed causes only. |
| Recent maintenance and changeover inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the CMMS. |
| Operator note content inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: treat as data. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: unplanned_downtime_root_cause_agent_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: first_out_alarm, type: double, nullable: false }
    - { name: similar_stop_precedent, type: double, nullable: false }
    - { name: recent_maintenance_and_changeover, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on First-out alarm and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Similar stop precedent against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as First-out alarm, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE unplanned_downtime_root_cause_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE unplanned_downtime_root_cause_steps (
  task_id TEXT NOT NULL REFERENCES unplanned_downtime_root_cause_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE unplanned_downtime_root_cause_approvals (
  task_id TEXT NOT NULL REFERENCES unplanned_downtime_root_cause_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Unplanned Downtime Root-Cause Agent": After a line stop, assemble the alarm sequence, operator notes, maintenance history and process data into a ranked list of probable causes and a draft downtime report for the shift lead. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Planning and scheduling are constraint problems | Production plans must respect machine capabilities, changeover times, material availability, labour and due dates. Small disruptions force a re-plan. | A forecast alone is not a plan, so models need to feed an optimiser that respects the constraints. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Anomaly detection in streams | An anomaly is a deviation from what is expected given seasonality, trend and context. Detectors learn expected behaviour and score deviations; the hard parts are shifting baselines, known events that move the level, sparse labels and the cost of false alerts. | Evaluate at event level with detection delay and a fixed alert budget, not point-wise accuracy. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: First-out alarm | The earliest alarm in the stop sequence. Points to the trigger. | Leakage risk to design against: Needs accurate clocks. |
| A signal-versus-noise trap in this use case: Sequence | The true signal is the order of alarms and states around the stop; the common noise is a single stop code. | The first alarm often hides the real cause. |

**Ask the experts**

- [ ] What exactly does "Evidence is cited from plant systems" mean in practice for unplanned downtime root-cause agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "First-out alarm" and "Similar stop precedent", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mean time to restart" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: using the stop reason as truth, and who can confirm the cut-off times and splits?
- [ ] How often does "Cascading stops" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CMMS | Computerised maintenance management system for work orders and assets. |
| Changeover | The time to switch a machine from one product to another. |
| Work order | An instruction to produce or repair something. |
| Downtime | Time when a machine is not producing. |
| Micro-stop | A short stop that is often unrecorded. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| PLC | Programmable logic controller: a rugged computer that controls machines. |
| Historian | A database for time-stamped sensor data from plants. |
| SPC | Statistical process control: using control charts to detect process drift. |
| Context window | The maximum amount of text a model can read at once. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Level shift | An abrupt, lasting change in a series' average. |
| Survival time series (hazard) | Modelling when an event will occur in a sequence of observations. |
| Remaining useful life | The estimated time before a machine or component fails. |
| State-space / Kalman filter | A model that tracks a hidden state through noisy observations and updates it over time. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Distribution shift | A change in the data a model sees compared with training. |
| Faithfulness | Whether an answer is supported by the cited sources. |
