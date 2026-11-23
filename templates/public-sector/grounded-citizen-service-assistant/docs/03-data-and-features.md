# Grounded Citizen Service Assistant: data and feature specification

> Generated from the blueprint `public-sector/grounded-citizen-service-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Grounded Citizen Service Assistant · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Grounded Citizen Service Assistant": Answer residents' questions about services, eligibility rules, fees and deadlines from official pages and forms, cite the source and hand over to a person for any case-specific decision. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Answering eligibility questions.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Source freshness | age of the page behind the answer | Trust | From the CMS |   |   |   |
| Question intent | information, status, form help or complaint | Routing | Classified |   |   |   |
| Language and accessibility need | language and format requested | Adaptation | From the session |   |   |   |
| Confidence and coverage | whether sources cover the question | Handoff | From retrieval |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Source | Official pages and forms with a last-updated date | Model memory | Out-of-date rules mislead residents |
| Scope | General guidance and next steps | Personal decisions | Decisions need a caseworker and an appeal route |
| Access | Plain language, many languages and accessible formats | English text only | Public services must serve everyone |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Resident name | irrelevant and private |
| Device model | irrelevant |
| Chat length | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Source freshness inputs | Digital service delivery | Case management and CRM | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the CMS. |
| Question intent inputs | Programme and policy owners | Tax, benefits and licensing systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: classified. |
| Language and accessibility need inputs | City operations | GIS and asset management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the session. |
| Confidence and coverage inputs | Digital service delivery | Case management and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from retrieval. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: grounded_citizen_service_assistant_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: source_freshness, type: double, nullable: false }
    - { name: question_intent, type: double, nullable: false }
    - { name: language_and_accessibility_need, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Source freshness and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Question intent against Case management and CRM
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Source freshness, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE grounded_citizen_service_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE grounded_citizen_service_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES grounded_citizen_service_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON grounded_citizen_service_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE grounded_citizen_service_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Grounded Citizen Service Assistant": Answer residents' questions about services, eligibility rules, fees and deadlines from official pages and forms, cite the source and hand over to a person for any case-specific decision. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Citizen service is multi-channel and multilingual | People contact government by phone, web, counter and post, in many languages, often at stressful moments. Good service gives consistent answers and a path to a human. | An assistant that gives wrong guidance on entitlements can cost someone their benefit. |
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Equity and fairness are measured across groups | Services affect different neighbourhoods, languages and groups differently, and historical data can embed past exclusion. Public bodies often have a legal equality duty. | Average accuracy hides differences, so outcomes should be checked across groups and areas. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Source freshness | Age of the page behind the answer. Trust. | Leakage risk to design against: From the CMS. |
| A signal-versus-noise trap in this use case: Source | The true signal is official pages and forms with a last-updated date; the common noise is model memory. | Out-of-date rules mislead residents. |

**Ask the experts**

- [ ] What exactly does "Answers come only from published official sources with a date" mean in practice for grounded citizen service assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Source freshness" and "Question intent", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Resolved contacts without staff" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: answering eligibility questions, and who can confirm the cut-off times and splits?
- [ ] How often does "Outdated page" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Caseworker | An official who assesses and manages cases for individuals. |
| Citizen portal | A website where residents access government services. |
| Eligibility | The rules that decide whether someone qualifies for a benefit or service. |
| Appeal | A formal challenge to a decision. |
| 311 service | A non-emergency service line for city issues. |
| Vulnerable person | Someone who needs extra support to use services safely. |
| Citizen identity | A verified digital identity for accessing services. |
| Administrative law | Law that governs how public bodies make decisions. |
| Smart city | A city that uses connected sensors and data to run services. |
| Service level | A target for response or resolution time. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
