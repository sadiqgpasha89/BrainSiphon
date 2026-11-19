# Unit Test & PR Description Generation: data and feature specification

> Generated from the blueprint `saas/test-generation-and-pr-description` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Unit Test & PR Description Generation · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Unit Test & PR Description Generation": Generate meaningful unit tests and PR descriptions from code changes, validated by execution and coverage. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rewarding coverage.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Compile and pass rate | generated tests that run | Reliability | CI |   |   |   |
| Mutation score | killed mutants share | Fault detection | Mutation tool |   |   |   |
| Coverage delta | new covered lines | Effect | Coverage tool |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Validation | Execute tests and measure coverage and mutation score | Accept generated text | Tests that always pass are worthless |
| Value | Mutation-detected faults not coverage | Line coverage | Coverage can be gamed by assertion-free tests |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Test count | quantity |
| Comment verbosity | cosmetic |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Compile and pass rate inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: CI. |
| Mutation score inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: mutation tool. |
| Coverage delta inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: coverage tool. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: test_generation_and_pr_description_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: compile_and_pass_rate, type: double, nullable: false }
    - { name: mutation_score, type: double, nullable: false }
    - { name: coverage_delta, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Compile and pass rate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Mutation score against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Compile and pass rate, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| COCO common objects | https://cocodataset.org/ | Annotations CC BY 4.0; images under Flickr terms | 330K images with object detection, segmentation and caption annotations | Everyday objects, not your domain. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE test_generation_and_pr_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE test_generation_and_pr_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES test_generation_and_pr_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON test_generation_and_pr_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE test_generation_and_pr_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Unit Test & PR Description Generation": Generate meaningful unit tests and PR descriptions from code changes, validated by execution and coverage. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Engineering productivity and developer tools | Code completion, review, test selection, flaky test detection, deployment risk and pull-request summarisation reduce developer toil. Quality is measured by acceptance, correctness (do the tests pass) and trust; noisy tools get switched off. | Offline benchmarks like pass rates on toy problems do not predict real-world usefulness; measure acceptance and time saved in real repositories. |
| Data platforms, quality and ML operations | Data pipelines move events into warehouses; data quality checks catch schema and volume problems; ML platforms track models, drift, evaluation of language-model applications and costs. Gateways route requests between models by cost and quality. | Many model failures are data failures; monitoring inputs and outputs is as important as the model. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Compile and pass rate | Generated tests that run. Reliability. | Leakage risk to design against: CI. |
| A signal-versus-noise trap in this use case: Validation | The true signal is execute tests and measure coverage and mutation score; the common noise is accept generated text. | Tests that always pass are worthless. |

**Ask the experts**

- [ ] What exactly does "Tests must compile and pass" mean in practice for unit test & pr description generation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Compile and pass rate" and "Mutation score", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Defects caught by generated tests" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: rewarding coverage, and who can confirm the cut-off times and splits?
- [ ] How often does "Generated tests assert current buggy behaviour" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Pull request (PR) | A proposed code change submitted for review before merging. |
| Flaky test | A test that sometimes passes and sometimes fails without any code change. |
| LLM gateway | A service that routes language-model requests between providers by cost, latency and quality. |
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| CI/CD | Continuous integration and delivery: automated building, testing and deployment of code. |
| Autoscaling | Automatically adding or removing compute resources as load changes. |
| FinOps | Managing cloud spend by tracking, allocating and optimising costs. |
| Schema matching | Mapping the columns of one data source to the fields of another. |
| Data lineage | A record of where data came from and how it was transformed. |
| LLM-as-judge | Using a language model to grade another model's outputs, calibrated against human labels. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Token cost | The price of a model call, proportional to input and output tokens. |
