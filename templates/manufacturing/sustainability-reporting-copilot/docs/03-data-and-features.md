# Sustainability Reporting Copilot: data and feature specification

> Generated from the blueprint `manufacturing/sustainability-reporting-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sustainability Reporting Copilot · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Sustainability Reporting Copilot": Help sustainability teams collect, check and draft disclosure content from plant, supplier and finance data, with every figure linked to its source and calculation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model-computed figures.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Data completeness by site | share of required metrics present | Gap finder | From the data catalogue |   |   |   |
| Calculation lineage | whether each figure traces to inputs | Audit readiness | From the lineage store |   |   |   |
| Period and boundary match | whether data fits the reporting scope | Consistency | From the config |   |   |   |
| Prior year change | change from the previous year | Plausibility check | Flag large moves |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Numbers | Computed by deterministic tools from controlled data | Model arithmetic | Models make arithmetic and unit errors |
| Evidence | A source link per statement | Narrative without references | Auditors need to trace every claim |
| Scope | The reporting boundary and period defined first | Whatever data is found | Inconsistent boundaries make reports wrong |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Writing style of site contacts | not evidence |
| Report length | not quality |
| Template colour | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Data completeness by site inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the data catalogue. |
| Calculation lineage inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the lineage store. |
| Period and boundary match inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the config. |
| Prior year change inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: flag large moves. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: sustainability_reporting_copilot_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: data_completeness_by_site, type: double, nullable: false }
    - { name: calculation_lineage, type: double, nullable: false }
    - { name: period_and_boundary_match, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Data completeness by site and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Calculation lineage against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Data completeness by site, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE sustainability_reporting_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE sustainability_reporting_steps (
  task_id TEXT NOT NULL REFERENCES sustainability_reporting_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE sustainability_reporting_approvals (
  task_id TEXT NOT NULL REFERENCES sustainability_reporting_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Sustainability Reporting Copilot": Help sustainability teams collect, check and draft disclosure content from plant, supplier and finance data, with every figure linked to its source and calculation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Overall equipment effectiveness shows where capacity is lost | OEE multiplies availability, performance and quality. Losses come from breakdowns, changeovers, slow cycles, minor stops and scrap, each with different causes and different fixes. | A model that improves one loss can worsen another, so the loss it targets must be named. |
| Process parameters interact | Temperature, pressure, speed and material properties interact to determine quality, and the best set-point changes with batch and equipment condition. Experiments on a live line are expensive. | Models should recommend set-points inside validated operating windows and let engineers approve changes. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Data completeness by site | Share of required metrics present. Gap finder. | Leakage risk to design against: From the data catalogue. |
| A signal-versus-noise trap in this use case: Numbers | The true signal is computed by deterministic tools from controlled data; the common noise is model arithmetic. | Models make arithmetic and unit errors. |

**Ask the experts**

- [ ] What exactly does "Every number links to a source record and a calculation" mean in practice for sustainability reporting copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Data completeness by site" and "Calculation lineage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Days to produce the report" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: model-computed figures, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing site data" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| OEE | Overall equipment effectiveness: availability times performance times quality. |
| SCADA | Supervisory control and data acquisition: systems that monitor and control industrial processes. |
| SPC | Statistical process control: using control charts to detect process drift. |
| Control chart | A chart of a process measure with limits that show when it is out of control. |
| Digital twin | A model of a machine or plant kept in step with real data. |
| Setpoint | The target value of a process variable. |
| Poka-yoke | Mistake-proofing built into a process. |
| Edge gateway | A device that collects and pre-processes plant data near the machines. |
| Supplier quality | The quality of incoming materials from suppliers. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| OCR | Optical character recognition: reading printed or handwritten text from images. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
