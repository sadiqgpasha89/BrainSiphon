# Benefits Eligibility Screening Assistant: data and feature specification

> Generated from the blueprint `public-sector/benefits-eligibility-screening-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Benefits Eligibility Screening Assistant · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Benefits Eligibility Screening Assistant": Help residents and caseworkers see which benefits they may qualify for from a short set of answers, with the rules shown, so eligible people apply and no automated denial occurs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Learned eligibility.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Rule match per programme | which rules are met and unmet | Core result | From the rules engine |   |   |   |
| Missing information | facts needed to complete the check | Follow-up question | From the engine |   |   |   |
| Rule version | the date and version of the rule | Correctness | From the rules store |   |   |   |
| Household circumstance flags | situations that change rules | Edge cases | Declared by the user |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Logic | Deterministic rules from the legal text | A learned predictor | Eligibility is defined by law not by pattern |
| Language | The assistant explains the result and next steps | The assistant deciding | Decisions need accountability and appeal rights |
| Privacy | Answers used for the screening only | Retained profiles | Retention invites function creep |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Resident name | irrelevant and private |
| Device type | irrelevant |
| Time of day | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Rule match per programme inputs | Digital service delivery | Case management and CRM | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the rules engine. |
| Missing information inputs | Programme and policy owners | Tax, benefits and licensing systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the engine. |
| Rule version inputs | City operations | GIS and asset management | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from the rules store. |
| Household circumstance flags inputs | Digital service delivery | Case management and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: declared by the user. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: benefits_eligibility_screening_assistant_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: rule_match_per_programme, type: double, nullable: false }
    - { name: missing_information, type: double, nullable: false }
    - { name: rule_version, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Rule match per programme and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Missing information against Case management and CRM
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Rule match per programme, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Phishing Websites | https://archive.ics.uci.edu/dataset/327/phishing+websites | CC BY 4.0 (see the UCI page) | 11,000 websites with URL and page features and a phishing label | Static features from one period; attackers adapt. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE benefits_eligibility_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE benefits_eligibility_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES benefits_eligibility_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON benefits_eligibility_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE benefits_eligibility_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Benefits Eligibility Screening Assistant": Help residents and caseworkers see which benefits they may qualify for from a short set of answers, with the rules shown, so eligible people apply and no automated denial occurs. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Procurement and records are accountable by law | Public bodies must follow procurement rules, keep records and respond to freedom of information requests. AI systems need documented purpose, data sources and decision logs. | A system that cannot be audited or explained to a regulator or journalist is a liability. |
| Citizen service is multi-channel and multilingual | People contact government by phone, web, counter and post, in many languages, often at stressful moments. Good service gives consistent answers and a path to a human. | An assistant that gives wrong guidance on entitlements can cost someone their benefit. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Rule match per programme | Which rules are met and unmet. Core result. | Leakage risk to design against: From the rules engine. |
| A signal-versus-noise trap in this use case: Logic | The true signal is deterministic rules from the legal text; the common noise is a learned predictor. | Eligibility is defined by law not by pattern. |

**Ask the experts**

- [ ] What exactly does "Rules-based eligibility logic with the rule text shown" mean in practice for benefits eligibility screening assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Rule match per programme" and "Missing information", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Take-up of eligible benefits" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: learned eligibility, and who can confirm the cut-off times and splits?
- [ ] How often does "Rule change" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Eligibility | The rules that decide whether someone qualifies for a benefit or service. |
| Entitlement | A benefit or service a person has a right to. |
| Caseworker | An official who assesses and manages cases for individuals. |
| Audit trail | A record of who did what and when. |
| Appeal | A formal challenge to a decision. |
| Administrative law | Law that governs how public bodies make decisions. |
| Means test | An assessment of income and assets for eligibility. |
| Welfare | Government support for people with low income or other need. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| PR-AUC | Area under the precision-recall curve; informative when positives are rare. |
| F1 score | The harmonic mean of precision and recall. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
