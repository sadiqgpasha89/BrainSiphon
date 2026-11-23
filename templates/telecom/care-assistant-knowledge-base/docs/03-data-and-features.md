# Customer Care Assistant over Knowledge Base: data and feature specification

> Generated from the blueprint `telecom/care-assistant-knowledge-base` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Care Assistant over Knowledge Base · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Customer Care Assistant over Knowledge Base": Answer customer and agent questions about plans, devices, coverage and billing from the operator's knowledge base with citations and safe escalation. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Measuring containment without correctness.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Retrieval relevance | similarity between the question and top articles | Grounds the answer | Evaluate on real intents |   |   |   |
| Article effective window | whether the article is currently valid | Prevents stale answers | Needs structured dates |   |   |   |
| Customer plan context | plan and device with consent | Personalises the answer | Use only what the task needs |   |   |   |
| Answer confidence | agreement among retrieved sources and the model | Escalation trigger | Calibrate on audited answers |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | The current approved knowledge article | Model memory of plans | Plans and prices change monthly |
| Scope | Questions the knowledge base can answer | Open-domain chat | A confident wrong answer about a price is a complaint or a refund |
| Freshness | Articles tagged with effective dates | A static index | Old promotions are quoted after they end |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Customer greeting style | not intent |
| Time of day | no link to the answer |
| Chat length | not quality |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Retrieval relevance inputs | Network engineering | OSS: inventory, fault and performance management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: evaluate on real intents. |
| Article effective window inputs | OSS/BSS platform team | BSS: CRM, order management and billing | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: needs structured dates. |
| Customer plan context inputs | Customer data office | Network element configuration and orchestration layer | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: use only what the task needs. |
| Answer confidence inputs | Network engineering | OSS: inventory, fault and performance management | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibrate on audited answers. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: care_assistant_knowledge_base_inputs.v1
owner: network-engineering@example.com
system_of_record: OSS: inventory, fault and performance management
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: retrieval_relevance, type: double, nullable: false }
    - { name: article_effective_window, type: double, nullable: false }
    - { name: customer_plan_context, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Retrieval relevance and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Article effective window against OSS: inventory, fault and performance management
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Retrieval relevance, traces back to OSS: inventory, fault and performance management; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| IBM Project CodeNet | https://github.com/IBM/Project_CodeNet | CDLA-Permissive 2.0 (see the repository) | 14 million code submissions across 55 languages with problem and verdict metadata | Competitive-programming style, not course assignments. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE care_assistant_knowledge_base_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE care_assistant_knowledge_base_steps (
  task_id TEXT NOT NULL REFERENCES care_assistant_knowledge_base_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE care_assistant_knowledge_base_approvals (
  task_id TEXT NOT NULL REFERENCES care_assistant_knowledge_base_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Telecommunications is a network business: millions of subscribers share radio, transport and core elements that fail together, so a single fault can show up as thousands of alarms and complaints. Models must separate cause from symptom, act within carrier-grade availability targets and respect strict privacy rules on subscriber location and usage data. For this use case, "Customer Care Assistant over Knowledge Base": Answer customer and agent questions about plans, devices, coverage and billing from the operator's knowledge base with citations and safe escalation. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Network quality is not customer experience | Customers feel video stalls, call quality, slow pages and failed activations, which depend on the end-to-end path and the device and not just on cell KPIs. Care contacts and surveys lag the experience by days. | Optimising network KPIs alone can leave the customers who complain unchanged. |
| Radio access KPIs describe cell health | Cells are judged on accessibility, retention (drop rate), throughput, handover success, resource block use and interference. These vary strongly by hour, cell type and terrain. | A KPI that is normal for a rural macro cell is a failure for a dense urban cell, so baselines must be per cell and per hour. |
| Subscriber data is regulated | Location, call and browsing records are personal data with retention limits, consent requirements and lawful-access rules. Analytics normally run on pseudonymised, aggregated data with strict access controls. | A use case that needs identified location data needs a legal basis and tight controls before any model is built. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Retrieval relevance | Similarity between the question and top articles. Grounds the answer. | Leakage risk to design against: Evaluate on real intents. |
| A signal-versus-noise trap in this use case: Source | The true signal is the current approved knowledge article; the common noise is model memory of plans. | Plans and prices change monthly. |

**Ask the experts**

- [ ] What exactly does "Answers cite the knowledge article and effective date" mean in practice for customer care assistant over knowledge base: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Retrieval relevance" and "Article effective window", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Contacts resolved without an agent" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: measuring containment without correctness, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflicting articles" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| BSS | Business support systems: customer-facing systems such as ordering, billing and customer management. |
| Trouble ticket | A record of a fault or complaint that tracks diagnosis and repair. |
| RAN | Radio access network: the cell sites and radio equipment that connect devices to the network. |
| CDR | Call detail record: a record of a call or data session used for billing and analytics. |
| QoS | Quality of service: measurable network performance such as latency, loss and throughput. |
| QoE | Quality of experience: how good a service feels to the user, such as video smoothness. |
| Backhaul | The link that carries traffic from a cell site to the core network. |
| SIM swap | Moving a number to a new SIM, a step abused in account takeover. |
| Latency | The delay between sending and receiving data. |
| Packet loss | The share of data packets that do not arrive. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Context window | The maximum amount of text a model can read at once. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Champion / challenger | The model in production and a candidate that must beat it before promotion. |
| A/B test | A randomised experiment comparing two versions on a business metric. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
