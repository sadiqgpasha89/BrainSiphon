# Maintenance Technician Copilot: data and feature specification

> Generated from the blueprint `manufacturing/maintenance-technician-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Maintenance Technician Copilot · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Maintenance Technician Copilot": Give technicians grounded answers from manuals, work-order history and asset data on a phone or tablet, with step-by-step procedures and safety notes, so repairs are faster and more consistent. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Paraphrasing safety steps.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Asset model match | the exact asset model and revision | Retrieves the right manual | From the CMMS |   |   |   |
| Symptom similarity | match to past work orders with the fix | Suggests precedent | Confirmed fixes only |   |   |   |
| Manual revision date | currency of the retrieved document | Avoids old procedures | From document control |   |   |   |
| Technician certification | qualifications held | Gates risky steps | From training records |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Controlled manuals and the asset's own history | General model knowledge | Wrong torque or voltage values cause injuries |
| Safety | Procedures retrieved from approved lockout documents | Paraphrased safety steps | Paraphrase loses critical details |
| Memory | Closed work orders with confirmed fixes | Open tickets | Open tickets record the symptom not the cure |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Technician chat style | not a diagnostic signal |
| Work-order age | not a fix signal |
| Photo resolution | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Asset model match inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the CMMS. |
| Symptom similarity inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: confirmed fixes only. |
| Manual revision date inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from document control. |
| Technician certification inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from training records. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: maintenance_technician_copilot_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: asset_model_match, type: double, nullable: false }
    - { name: symptom_similarity, type: double, nullable: false }
    - { name: manual_revision_date, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Asset model match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Symptom similarity against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Asset model match, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Spider text-to-SQL | https://yale-lily.github.io/spider | CC BY-SA 4.0 (see the site) | 10,000 questions with SQL over 200 databases for cross-domain text-to-SQL | Clean academic schemas, simpler than production. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE maintenance_technician_copilot_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE maintenance_technician_copilot_steps (
  task_id TEXT NOT NULL REFERENCES maintenance_technician_copilot_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE maintenance_technician_copilot_approvals (
  task_id TEXT NOT NULL REFERENCES maintenance_technician_copilot_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Maintenance Technician Copilot": Give technicians grounded answers from manuals, work-order history and asset data on a phone or tablet, with step-by-step procedures and safety notes, so repairs are faster and more consistent. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Operational technology has its own safety and network rules | Control systems use PLCs, SCADA and industrial protocols on segmented networks. Changing them can stop production or hurt people, so analytics read data and recommend, while closed-loop control stays with validated systems. | An AI system that writes to a controller needs the same change control as any safety-related modification. |
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Asset model match | The exact asset model and revision. Retrieves the right manual. | Leakage risk to design against: From the CMMS. |
| A signal-versus-noise trap in this use case: Source | The true signal is controlled manuals and the asset's own history; the common noise is general model knowledge. | Wrong torque or voltage values cause injuries. |

**Ask the experts**

- [ ] What exactly does "Every answer cites the manual page or work order" mean in practice for maintenance technician copilot: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Asset model match" and "Symptom similarity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Mean time to repair" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: paraphrasing safety steps, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflicting manuals" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CMMS | Computerised maintenance management system for work orders and assets. |
| Work order | An instruction to produce or repair something. |
| Lockout tagout | A procedure to isolate energy before maintenance. |
| Historian | A database for time-stamped sensor data from plants. |
| Predictive maintenance | Servicing equipment based on predicted condition instead of a fixed schedule. |
| Digital twin | A model of a machine or plant kept in step with real data. |
| FMEA | Failure mode and effects analysis: a structured review of how a design or process can fail. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Chunking | Splitting documents into pieces for indexing and retrieval. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Abstention | Declining to answer because the evidence is missing. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
