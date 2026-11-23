# Supplier Disruption Sensing Agent: data and feature specification

> Generated from the blueprint `manufacturing/supplier-disruption-sensing-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supplier Disruption Sensing Agent · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Supplier Disruption Sensing Agent": Watch news, weather, port and supplier signals for events that threaten critical inputs, link them to affected parts and orders, and brief the buyers with options. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Alerting on headlines.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Event location match | whether the event area contains a supplier site or lane | Relevance | Needs supplier geocodes |   |   |   |
| Part criticality | single-source and downtime cost of affected parts | Priority | From the bill of materials |   |   |   |
| Inventory cover | days of stock for the affected parts | Urgency | From ERP |   |   |   |
| Source reliability | past accuracy of the source | Weighting | Maintained list |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Trusted and dated sources with named locations | Unverified social posts | Rumours trigger unnecessary actions |
| Linkage | Events mapped to supplier sites, lanes and parts | Headlines only | A headline matters only if it touches your supply |
| Output | A short brief with options and costs | An alert flood | Buyers stop reading floods |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Headline wording | not impact |
| Social media volume | not reliability |
| Article length | not relevance |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Event location match inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: needs supplier geocodes. |
| Part criticality inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the bill of materials. |
| Inventory cover inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from ERP. |
| Source reliability inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: maintained list. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: supplier_disruption_sensing_agent_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: event_location_match, type: double, nullable: false }
    - { name: part_criticality, type: double, nullable: false }
    - { name: inventory_cover, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Event location match and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Part criticality against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Event location match, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE supplier_disruption_sensing_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE supplier_disruption_sensing_steps (
  task_id TEXT NOT NULL REFERENCES supplier_disruption_sensing_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE supplier_disruption_sensing_approvals (
  task_id TEXT NOT NULL REFERENCES supplier_disruption_sensing_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Supplier Disruption Sensing Agent": Watch news, weather, port and supplier signals for events that threaten critical inputs, link them to affected parts and orders, and brief the buyers with options. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Traceability links parts to materials and settings | Lot and serial numbers connect each finished item to its materials, machine, settings and test results, which makes recalls and root cause analysis possible. | Poor traceability turns a small quality problem into a large recall. |
| Planning and scheduling are constraint problems | Production plans must respect machine capabilities, changeover times, material availability, labour and due dates. Small disruptions force a re-plan. | A forecast alone is not a plan, so models need to feed an optimiser that respects the constraints. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Event location match | Whether the event area contains a supplier site or lane. Relevance. | Leakage risk to design against: Needs supplier geocodes. |
| A signal-versus-noise trap in this use case: Source | The true signal is trusted and dated sources with named locations; the common noise is unverified social posts. | Rumours trigger unnecessary actions. |

**Ask the experts**

- [ ] What exactly does "Every alert cites its sources" mean in practice for supplier disruption sensing agent: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Event location match" and "Part criticality", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Lead time before disruption impact" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: alerting on headlines, and who can confirm the cut-off times and splits?
- [ ] How often does "Duplicate reports" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Bill of materials | The list of parts and materials needed to make a product. |
| Supplier quality | The quality of incoming materials from suppliers. |
| MTBF | Mean time between failures. |
| Kanban | A pull system that signals when to make or move more material. |
| Downtime | Time when a machine is not producing. |
| Micro-stop | A short stop that is often unrecorded. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
