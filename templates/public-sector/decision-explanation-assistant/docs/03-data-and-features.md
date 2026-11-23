# Decision Explanation and Appeal Assistant: data and feature specification

> Generated from the blueprint `public-sector/decision-explanation-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Decision Explanation and Appeal Assistant · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Decision Explanation and Appeal Assistant": Help caseworkers write clear decision letters from the recorded reasons and legal basis and tell people how to appeal, without changing the decision or adding reasons. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Invented reasons.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Decision record fields | outcome, reasons and facts relied on | Content | From the case system |   |   |   |
| Legal basis | statute and policy sections | Citation | From the rule base |   |   |   |
| Appeal deadline and route | statutory deadlines | Required content | From templates |   |   |   |
| Reading level | grade level of the text | Understanding | From metrics |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | The decision record and statute | Model reasoning | Invented reasons make decisions unlawful |
| Right | A clear reason and appeal route | A short outcome | People have a right to understand and challenge decisions |
| Authority | The caseworker signs | The assistant sending letters | Accountability needs a person |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Applicant name | irrelevant for the model |
| Letter length | weak link |
| Template colour | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Decision record fields inputs | Digital service delivery | Case management and CRM | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the case system. |
| Legal basis inputs | Programme and policy owners | Tax, benefits and licensing systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the rule base. |
| Appeal deadline and route inputs | City operations | GIS and asset management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from templates. |
| Reading level inputs | Digital service delivery | Case management and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from metrics. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: decision_explanation_assistant_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: decision_record_fields, type: double, nullable: false }
    - { name: legal_basis, type: double, nullable: false }
    - { name: appeal_deadline_and_route, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Decision record fields and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Legal basis against Case management and CRM
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Decision record fields, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE decision_explanation_assistant_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE decision_explanation_assistant_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES decision_explanation_assistant_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON decision_explanation_assistant_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE decision_explanation_assistant_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Decision Explanation and Appeal Assistant": Help caseworkers write clear decision letters from the recorded reasons and legal basis and tell people how to appeal, without changing the decision or adding reasons. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Planning relies on forecasts with uncertainty | Housing, schools, transport and services are planned from population, demand and land-use forecasts that carry wide uncertainty, so scenarios matter more than single numbers. | A single forecast presented as certain can lock in the wrong capacity. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Decision record fields | Outcome, reasons and facts relied on. Content. | Leakage risk to design against: From the case system. |
| A signal-versus-noise trap in this use case: Source | The true signal is the decision record and statute; the common noise is model reasoning. | Invented reasons make decisions unlawful. |

**Ask the experts**

- [ ] What exactly does "Letters use only the recorded reasons and the legal basis" mean in practice for decision explanation and appeal assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Decision record fields" and "Legal basis", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Letter drafting time" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: invented reasons, and who can confirm the cut-off times and splits?
- [ ] How often does "Missing reasons" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Appeal | A formal challenge to a decision. |
| Caseworker | An official who assesses and manages cases for individuals. |
| Administrative law | Law that governs how public bodies make decisions. |
| Case management | Systems for tracking cases through a process. |
| Audit trail | A record of who did what and when. |
| Service level | A target for response or resolution time. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
