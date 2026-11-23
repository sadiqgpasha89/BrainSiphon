# Meeting Minutes and Action Tracking: data and feature specification

> Generated from the blueprint `engineering/meeting-minutes-action-tracking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Meeting Minutes and Action Tracking · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Meeting Minutes and Action Tracking": Draft minutes and extract decisions and actions from project meeting transcripts and notes, assign owners for confirmation and track completion across projects. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Covert recording.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Decision statements | agreements in the text | Core | From the transcript |   |   |   |
| Action items and owners | tasks with named people | Core | From the transcript |   |   |   |
| Due dates | stated or implied dates | Tracking | From the transcript |   |   |   |
| Open actions from earlier meetings | carried-over items | Follow-up | From the tracker |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Consented transcripts and chair notes | Covert recording | Consent is required |
| Output | Decisions, actions and owners | A transcript summary | Teams need actions |
| Control | Attendee confirmation | Auto-assigned owners | Wrong owners lose tasks |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Speaker voice | personal data |
| Meeting room name | irrelevant |
| Platform | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Decision statements inputs | Engineering management | CAD, BIM and document management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the transcript. |
| Action items and owners inputs | Project delivery | Project scheduling and cost control platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the transcript. |
| Due dates inputs | Health, safety and quality | Quality, safety and inspection records | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the transcript. |
| Open actions from earlier meetings inputs | Engineering management | CAD, BIM and document management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the tracker. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: meeting_minutes_action_tracking_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: decision_statements, type: double, nullable: false }
    - { name: action_items_and_owners, type: double, nullable: false }
    - { name: due_dates, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Decision statements and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Action items and owners against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Decision statements, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE meeting_minutes_action_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE meeting_minutes_action_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES meeting_minutes_action_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON meeting_minutes_action_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE meeting_minutes_action_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Meeting Minutes and Action Tracking": Draft minutes and extract decisions and actions from project meeting transcripts and notes, assign owners for confirmation and track completion across projects. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Cost grows through change | Cost overruns come from scope change, design maturity, market prices and productivity. Early estimates carry wide uncertainty that narrows as design matures. | Reporting a single number at an early stage hides the range. |
| Site safety is about conditions | Hazards such as open edges, exclusion zones and plant movement can be detected at scene level. Monitoring individual workers raises legal and trust issues. | Safety tools support inspections and do not replace them. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Decision statements | Agreements in the text. Core. | Leakage risk to design against: From the transcript. |
| A signal-versus-noise trap in this use case: Source | The true signal is consented transcripts and chair notes; the common noise is covert recording. | Consent is required. |

**Ask the experts**

- [ ] What exactly does "Participants consent to recording" mean in practice for meeting minutes and action tracking: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Decision statements" and "Action items and owners", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Action completion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: covert recording, and who can confirm the cut-off times and splits?
- [ ] How often does "Cross-talk" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Bill of quantities | A list of items and quantities for pricing. |
| As-built | The record of what was actually built. |
| Claim | A request for extra time or money under a contract. |
| Health and safety plan | A plan for managing risk on a project. |
| Portfolio | A set of projects managed together. |
| Lessons learned | Knowledge captured from past projects. |
| Engineer of record | The licensed engineer responsible for a design. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Faithfulness | Whether an answer is supported by the cited sources. |
