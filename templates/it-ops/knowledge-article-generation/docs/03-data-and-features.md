# Knowledge Article Generation from Tickets: data and feature specification

> Generated from the blueprint `it-ops/knowledge-article-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Knowledge Article Generation from Tickets · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Knowledge Article Generation from Tickets": Draft knowledge articles from solved tickets and chat transcripts, remove personal data and route them to subject matter experts for review before publication. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Auto-publishing.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Resolution steps | the fix recorded in the ticket | Content | From the ticket |   |   |   |
| Recurrence count | how often the issue appears | Priority | From history |   |   |   |
| Existing article match | similar published articles | Dedup | From the knowledge base |   |   |   |
| Resolution confirmation | whether the requester confirmed the fix | Quality | From the ticket |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Verified resolutions | Every closed ticket | Many closes are workarounds |
| Privacy | Redacted drafts | Raw transcripts | Tickets contain personal data |
| Quality | Expert review and usage feedback | Auto-publish | Wrong articles mislead users |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Requester name | personal data |
| Agent name | irrelevant |
| Ticket number | an identifier |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Resolution steps inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the ticket. |
| Recurrence count inputs | Service management | Configuration management database | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from history. |
| Existing article match inputs | Security operations | Monitoring, logging and cloud billing platforms | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the knowledge base. |
| Resolution confirmation inputs | Infrastructure and operations | IT service management platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the ticket. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: knowledge_article_generation_inputs.v1
owner: infrastructure-and-operations@example.com
system_of_record: IT service management platform
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: resolution_steps, type: double, nullable: false }
    - { name: recurrence_count, type: double, nullable: false }
    - { name: existing_article_match, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Resolution steps and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Recurrence count against IT service management platform
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Resolution steps, traces back to IT service management platform; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE knowledge_article_generation_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE knowledge_article_generation_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES knowledge_article_generation_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON knowledge_article_generation_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE knowledge_article_generation_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

IT operations keeps services running and people productive across data centres, clouds, networks and devices. Data arrives as huge volumes of metrics, logs, alerts and tickets, most of it noise, and changes made to production by automation must be controlled as carefully as changes made by people. For this use case, "Knowledge Article Generation from Tickets": Draft knowledge articles from solved tickets and chat transcripts, remove personal data and route them to subject matter experts for review before publication. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Service desks resolve repeat requests | Most tickets are password resets, access requests, device problems and how-to questions with known answers. Good knowledge and automation deflect them while keeping humans for complex cases. | Closing a chat without solving the problem looks like success in the numbers and fails the employee. |
| Alerts are mostly noise | Monitoring tools raise thousands of alerts, many duplicate or symptoms of one fault. Grouping alerts by topology and time into incidents reduces pages and speeds diagnosis. | Suppressing alerts without visibility can hide a real outage, so grouped alerts must stay inspectable. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Resolution steps | The fix recorded in the ticket. Content. | Leakage risk to design against: From the ticket. |
| A signal-versus-noise trap in this use case: Source | The true signal is verified resolutions; the common noise is every closed ticket. | Many closes are workarounds. |

**Ask the experts**

- [ ] What exactly does "Personal data removed from drafts" mean in practice for knowledge article generation from tickets: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Resolution steps" and "Recurrence count", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Knowledge coverage of top issues" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: auto-publishing, and who can confirm the cut-off times and splits?
- [ ] How often does "Incorrect fix" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| ITSM | IT service management: the practice and tools for managing IT services. |
| DLP | Data loss prevention: controls that stop sensitive data leaving. |
| Problem record | A record of the underlying cause of one or more incidents. |
| Change request | A proposal to change a production system. |
| MTTD | Mean time to detect a problem. |
| Runbook | A documented procedure for handling a known situation. |
| Postmortem | A blameless review after an incident. |
| Telemetry | Data sent from systems about their state. |
| Tagging | Labels on resources used to assign cost and owners. |
| Patch | A software update that fixes a flaw. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
