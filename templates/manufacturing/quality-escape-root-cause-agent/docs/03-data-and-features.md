# Quality Escape Root-Cause Agent: data and feature specification

> Generated from the blueprint `manufacturing/quality-escape-root-cause-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Quality Escape Root-Cause Agent · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Quality Escape Root-Cause Agent": When a defect reaches a customer or a late test, trace the affected lots through genealogy, line data and supplier records, rank likely causes and draft the containment and corrective action plan for the quality engineer. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Guessing the affected lots.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Genealogy coverage | lots linked to the suspect part, material or tool | Defines containment | Needs complete traceability |   |   |   |
| Process excursion overlap | alarms and excursions on the affected lots | Cause evidence | Align by lot and station |   |   |   |
| Supplier lot association | incoming material lots shared by affected parts | Material cause | Join by lot |   |   |   |
| Past similar escapes | earlier cases with confirmed causes | Hypothesis source | Only confirmed causes |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Scope | Genealogy-defined affected lots | A guessed date range | A wide guess ships good parts to scrap and a narrow one ships bad parts to customers |
| Cause | Evidence from process, material and tool data | A plausible story from the complaint text | Plausible causes waste investigation days |
| Action | A containment recommendation with quantities and locations | A summary | Quality teams need lists to act |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Complaint wording | emotional language is not evidence |
| Customer size | not a cause |
| Complaint channel | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Genealogy coverage inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: needs complete traceability. |
| Process excursion overlap inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: align by lot and station. |
| Supplier lot association inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: join by lot. |
| Past similar escapes inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: only confirmed causes. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: quality_escape_root_cause_agent_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: genealogy_coverage, type: double, nullable: false }
    - { name: process_excursion_overlap, type: double, nullable: false }
    - { name: supplier_lot_association, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Genealogy coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Process excursion overlap against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Genealogy coverage, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE quality_escape_root_cause_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE quality_escape_root_cause_steps (
  task_id TEXT NOT NULL REFERENCES quality_escape_root_cause_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE quality_escape_root_cause_approvals (
  task_id TEXT NOT NULL REFERENCES quality_escape_root_cause_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Quality Escape Root-Cause Agent": When a defect reaches a customer or a late test, trace the affected lots through genealogy, line data and supplier records, rank likely causes and draft the containment and corrective action plan for the quality engineer. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Genealogy coverage | Lots linked to the suspect part, material or tool. Defines containment. | Leakage risk to design against: Needs complete traceability. |
| A signal-versus-noise trap in this use case: Scope | The true signal is genealogy-defined affected lots; the common noise is a guessed date range. | A wide guess ships good parts to scrap and a narrow one ships bad parts to customers. |

**Ask the experts**

- [ ] What exactly does "Containment lists generated from genealogy data and verified by an engineer" mean in practice for quality escape root-cause agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Genealogy coverage" and "Process excursion overlap", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to containment" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: guessing the affected lots, and who can confirm the cut-off times and splits?
- [ ] How often does "Incomplete genealogy" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Supplier quality | The quality of incoming materials from suppliers. |
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| Scrap | Material or parts that cannot be sold. |
| Rework | Fixing a defective part so it can be sold. |
| First pass yield | The share of units that pass without rework. |
| Lot traceability | Tracking which materials and settings went into each lot. |
| Six Sigma | A method for reducing defects through data. |
| MES | Manufacturing execution system: software that tracks production on the shop floor. |
| Historian | A database for time-stamped sensor data from plants. |
| Cycle time | The time to complete one unit of work at a station. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
