# Plain Language and Accessibility Rewriter: data and feature specification

> Generated from the blueprint `public-sector/plain-language-rewriter` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Plain Language and Accessibility Rewriter · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Plain Language and Accessibility Rewriter": Rewrite letters, guidance and forms in plain language and accessible formats for review, so residents understand what to do and by when. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Readability scores alone.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Reading level | grade and sentence length | Readability | From metrics |   |   |   |
| Number and date preservation | whether dates and amounts match the original | Safety | From extraction |   |   |   |
| Terms against glossary | consistent legal terms | Meaning | From the glossary |   |   |   |
| Structure and headings | clear order of actions | Usability | From the layout |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Meaning | Preserved legal content and deadlines | Shorter text | Shortening can drop a condition |
| Review | Policy owner approval | Automatic publishing | A rewrite can change a right |
| Test | Comprehension tests with residents | Readability scores alone | Scores do not show understanding |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Author name | irrelevant |
| Document length alone | weak link |
| Font choice | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Reading level inputs | Digital service delivery | Case management and CRM | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from metrics. |
| Number and date preservation inputs | Programme and policy owners | Tax, benefits and licensing systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from extraction. |
| Terms against glossary inputs | City operations | GIS and asset management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the glossary. |
| Structure and headings inputs | Digital service delivery | Case management and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the layout. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: plain_language_rewriter_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: reading_level, type: double, nullable: false }
    - { name: number_and_date_preservation, type: double, nullable: false }
    - { name: terms_against_glossary, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Reading level and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Number and date preservation against Case management and CRM
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Reading level, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| RACE reading comprehension | https://www.cs.cmu.edu/~glai1/data/race/ | Research use (see the page) | About 28,000 passages and 100,000 exam questions from English exams for Chinese students | Exam questions, one population. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE plain_language_rewriter_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE plain_language_rewriter_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES plain_language_rewriter_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON plain_language_rewriter_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE plain_language_rewriter_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Plain Language and Accessibility Rewriter": Rewrite letters, guidance and forms in plain language and accessible formats for review, so residents understand what to do and by when. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Equity and fairness are measured across groups | Services affect different neighbourhoods, languages and groups differently, and historical data can embed past exclusion. Public bodies often have a legal equality duty. | Average accuracy hides differences, so outcomes should be checked across groups and areas. |
| Citizen service is multi-channel and multilingual | People contact government by phone, web, counter and post, in many languages, often at stressful moments. Good service gives consistent answers and a path to a human. | An assistant that gives wrong guidance on entitlements can cost someone their benefit. |
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Reading level | Grade and sentence length. Readability. | Leakage risk to design against: From metrics. |
| A signal-versus-noise trap in this use case: Meaning | The true signal is preserved legal content and deadlines; the common noise is shorter text. | Shortening can drop a condition. |

**Ask the experts**

- [ ] What exactly does "Legal meaning preserved and checked by a reviewer" mean in practice for plain language and accessibility rewriter: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Reading level" and "Number and date preservation", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Contacts caused by unclear letters" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: readability scores alone, and who can confirm the cut-off times and splits?
- [ ] How often does "Legal nuance" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Digital inclusion | Making sure people without digital access can still use services. |
| Service level | A target for response or resolution time. |
| Citizen identity | A verified digital identity for accessing services. |
| Eligibility | The rules that decide whether someone qualifies for a benefit or service. |
| Entitlement | A benefit or service a person has a right to. |
| Appeal | A formal challenge to a decision. |
| Case management | Systems for tracking cases through a process. |
| Permit | Official permission to do something such as build. |
| Origin-destination matrix | A table of trips between places. |
| Asset register | A list of infrastructure assets and their condition. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Toxicity classification | Detecting abusive, hateful or harassing language. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
