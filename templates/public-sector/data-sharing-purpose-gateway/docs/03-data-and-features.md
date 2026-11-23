# Cross-Agency Data Sharing Purpose Gateway: data and feature specification

> Generated from the blueprint `public-sector/data-sharing-purpose-gateway` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Agency Data Sharing Purpose Gateway · **Domain:** public-sector · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Cross-Agency Data Sharing Purpose Gateway": Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Prompt-based enforcement.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Requester and purpose code | agency and declared purpose | Policy input | From the request |   |   |   |
| Legal basis and consent state | statute, agreement and consent | Decision | From the policy store |   |   |   |
| Field sensitivity class | sensitivity of requested fields | Minimisation | From the catalogue |   |   |   |
| Request volume anomaly | unusual request rates | Misuse | From logs |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Enforcement | A policy engine with legal basis as data | Prompt instructions | Prompts can be bypassed |
| Minimisation | Only fields needed for the purpose | Whole records | Excess data raises risk and breaches law |
| Transparency | A log that people can inspect | An internal log only | Public trust depends on visibility |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Requester name | irrelevant |
| Request wording | not policy |
| Agency size | irrelevant |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Requester and purpose code inputs | Digital service delivery | Case management and CRM | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the request. |
| Legal basis and consent state inputs | Programme and policy owners | Tax, benefits and licensing systems | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the policy store. |
| Field sensitivity class inputs | City operations | GIS and asset management | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: from the catalogue. |
| Request volume anomaly inputs | Digital service delivery | Case management and CRM | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from logs. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: data_sharing_purpose_gateway_inputs.v1
owner: digital-service-delivery@example.com
system_of_record: Case management and CRM
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: requester_and_purpose_code, type: double, nullable: false }
    - { name: legal_basis_and_consent_state, type: double, nullable: false }
    - { name: field_sensitivity_class, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Requester and purpose code and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Legal basis and consent state against Case management and CRM
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Requester and purpose code, traces back to Case management and CRM; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE data_sharing_purpose_gateway_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE data_sharing_purpose_gateway_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES data_sharing_purpose_gateway_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON data_sharing_purpose_gateway_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE data_sharing_purpose_gateway_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Public sector and smart city systems decide on people's entitlements, services and shared infrastructure, so every decision must be lawful, explainable and open to appeal. Data is spread across agencies, equity matters as much as efficiency, and caseworkers and officials remain accountable for decisions about individuals. For this use case, "Cross-Agency Data Sharing Purpose Gateway": Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Data sharing between agencies is restricted | Agencies may share data only where law permits and for stated purposes. Linking records to build a profile of a person can breach purpose limits. | Linking data for a new purpose needs legal review before any model is built. |
| Decisions about people need a legal basis and an appeal | Benefits, permits, tax and enforcement decisions follow statute and policy, and citizens can challenge them. Automated systems support officials and cannot replace the reasoning a decision must record. | A model that cannot give reasons that match the law cannot be used for the final decision. |
| Procurement and records are accountable by law | Public bodies must follow procurement rules, keep records and respond to freedom of information requests. AI systems need documented purpose, data sources and decision logs. | A system that cannot be audited or explained to a regulator or journalist is a liability. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Requester and purpose code | Agency and declared purpose. Policy input. | Leakage risk to design against: From the request. |
| A signal-versus-noise trap in this use case: Enforcement | The true signal is a policy engine with legal basis as data; the common noise is prompt instructions. | Prompts can be bypassed. |

**Ask the experts**

- [ ] What exactly does "Policy enforced outside the model in a gateway" mean in practice for cross-agency data sharing purpose gateway: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Requester and purpose code" and "Legal basis and consent state", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Requests denied for no basis" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: prompt-based enforcement, and who can confirm the cut-off times and splits?
- [ ] How often does "Purpose creep" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Data sharing agreement | A legal document that sets rules for sharing data between bodies. |
| Purpose limitation | The rule that data may only be used for the purpose it was collected for. |
| Administrative law | Law that governs how public bodies make decisions. |
| Smart city | A city that uses connected sensors and data to run services. |
| Open data | Data published for anyone to reuse. |
| Caseworker | An official who assesses and manages cases for individuals. |
| Appeal | A formal challenge to a decision. |
| Citizen portal | A website where residents access government services. |
| 311 service | A non-emergency service line for city issues. |
| Freedom of information | A right to request records from public bodies. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Token cost | The price of a model call, proportional to input and output tokens. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Latency budget | The time allowed for a response, split across retrieval, generation and checks. |
