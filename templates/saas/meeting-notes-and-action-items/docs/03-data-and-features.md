# Meeting Notes & Action-Item Extraction: data and feature specification

> Generated from the blueprint `saas/meeting-notes-and-action-items` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Meeting Notes & Action-Item Extraction · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Meeting Notes & Action-Item Extraction": Turn meeting recordings into accurate notes, decisions and owned action items that sync to task tools. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating summaries not actions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Owner-resolution accuracy | correct person for each action | Utility | Diarisation |   |   |   |
| Decision detection | decision statements | Notes | Classifier |   |   |   |
| Span support rate | notes with transcript support | Faithfulness | Alignment |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Attribution | Correct owner and deadline extraction | Generic summary | Actions with wrong owners are worse than none |
| Faithfulness | Span-grounded notes | Fluent summaries | Hallucinated decisions mislead teams |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Small talk | not content |
| Meeting length | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Owner-resolution accuracy inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: diarisation. |
| Decision detection inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: classifier. |
| Span support rate inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: alignment. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: meeting_notes_and_action_items_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: owner_resolution_accuracy, type: double, nullable: false }
    - { name: decision_detection, type: double, nullable: false }
    - { name: span_support_rate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Owner-resolution accuracy and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Decision detection against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Owner-resolution accuracy, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE meeting_notes_and_action_items_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE meeting_notes_and_action_items_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES meeting_notes_and_action_items_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON meeting_notes_and_action_items_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE meeting_notes_and_action_items_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Meeting Notes & Action-Item Extraction": Turn meeting recordings into accurate notes, decisions and owned action items that sync to task tools. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| OpenAPI as ground truth | An OpenAPI specification describes endpoints, parameters, request and response schemas and authentication in machine-readable form. Because it is precise, it can validate that every endpoint or field in a generated answer exists. | It turns hallucination checking from opinion into a lookup, and it is the cheapest strong guard you can add. |
| Evaluating a docs assistant | A golden set of real questions with known answers, including unanswerable and version-specific ones, is scored for correctness, faithfulness to the cited source, abstention when the docs are silent and, for code, whether the snippet compiles and runs. Questions written from page headings are too easy. | Abstaining is a feature. A refusal that is right is better than an answer that is plausible and wrong. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Owner-resolution accuracy | Correct person for each action. Utility. | Leakage risk to design against: Diarisation. |
| A signal-versus-noise trap in this use case: Attribution | The true signal is correct owner and deadline extraction; the common noise is generic summary. | Actions with wrong owners are worse than none. |

**Ask the experts**

- [ ] What exactly does "Consent and recording rules" mean in practice for meeting notes & action-item extraction: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Owner-resolution accuracy" and "Decision detection", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Action completion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating summaries not actions, and who can confirm the cut-off times and splits?
- [ ] How often does "Two participants share a first name" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Meeting notes and action items | Summaries and tasks extracted from meetings, where attributing owners correctly is the main failure. |
| RAG monitoring | Checking that retrieval-augmented answers remain grounded in their sources over time. |
| In-app copilot | An assistant inside a product that answers questions and can take actions on the user's behalf. |
| Time to first successful call | How long a new developer takes to make a working API request, a common docs-quality metric. |
| Sequential testing | Statistical methods that allow results to be checked repeatedly without inflating false positives. |
| Feature flag | A switch that turns a feature on for chosen users, used for gradual rollouts and experiments. |
| Ticket deflection | Resolving a question through self-service so no support ticket is created. |
| Knowledge base | The collection of help articles an assistant can retrieve and cite. |
| Schema matching | Mapping the columns of one data source to the fields of another. |
| Data lineage | A record of where data came from and how it was transformed. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
