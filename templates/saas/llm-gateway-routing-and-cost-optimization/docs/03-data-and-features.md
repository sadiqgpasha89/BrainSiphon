# LLM Gateway Routing & Cost Optimisation: data and feature specification

> Generated from the blueprint `saas/llm-gateway-routing-and-cost-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Gateway Routing & Cost Optimisation · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "LLM Gateway Routing & Cost Optimisation": Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Router trained on judge scores with bias.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Query difficulty estimate | predicted need for strong model | Routing | Router model |   |   |   |
| Cache hit probability | semantic similarity to cached | Savings | Index |   |   |   |
| Provider health and latency | live status | Fallback | Monitors |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Quality | Learned router evaluated against a task-specific quality bar | Always the largest model | Most requests don't need the largest model |
| Caching | Semantic and prefix caching with safety | No caching | Repeated prompts are common and expensive |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Prompt length alone | weak |
| Team name | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Query difficulty estimate inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: router model. |
| Cache hit probability inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: index. |
| Provider health and latency inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: monitors. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: llm_gateway_routing_and_cost_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: query_difficulty_estimate, type: double, nullable: false }
    - { name: cache_hit_probability, type: double, nullable: false }
    - { name: provider_health_and_latency, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Query difficulty estimate and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Cache hit probability against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Query difficulty estimate, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE llm_gateway_routing_and_cost_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE llm_gateway_routing_and_cost_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES llm_gateway_routing_and_cost_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON llm_gateway_routing_and_cost_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE llm_gateway_routing_and_cost_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "LLM Gateway Routing & Cost Optimisation": Route each LLM request to the cheapest model that meets quality needs, with caching, rate limiting and fallbacks. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Data platforms, quality and ML operations | Data pipelines move events into warehouses; data quality checks catch schema and volume problems; ML platforms track models, drift, evaluation of language-model applications and costs. Gateways route requests between models by cost and quality. | Many model failures are data failures; monitoring inputs and outputs is as important as the model. |
| How retrieval-augmented answering fails | The assistant splits docs into chunks, retrieves the most relevant ones (keyword search, embeddings or both) and has a language model answer from them with citations. Failures include retrieving the wrong version, quoting a stale value from a changelog, inventing an endpoint, answering a question the docs never cover and a citation that exists but does not support the claim. | Each failure needs its own test. Measure them separately, not as one accuracy number. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Optimisation under uncertainty | Routing, scheduling, allocation and pricing are optimisation problems solved on predicted costs or demands. Optimising noisy predictions selects options whose errors are favourable (the optimiser's curse), so plans are optimistic. Remedies: uncertainty penalties, robust or stochastic optimisation, re-planning and safe exploration. | Judge a plan on realised outcomes, and track the gap between promised and realised cost. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Query difficulty estimate | Predicted need for strong model. Routing. | Leakage risk to design against: Router model. |
| A signal-versus-noise trap in this use case: Quality | The true signal is learned router evaluated against a task-specific quality bar; the common noise is always the largest model. | Most requests don't need the largest model. |

**Ask the experts**

- [ ] What exactly does "Routing overhead under 20 ms" mean in practice for llm gateway routing & cost optimisation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Query difficulty estimate" and "Cache hit probability", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Cost per request" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: router trained on judge scores with bias, and who can confirm the cut-off times and splits?
- [ ] How often does "Cache returns an answer for a similar but different question" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| LLM gateway | A service that routes language-model requests between providers by cost, latency and quality. |
| LLM-as-judge | Using a language model to grade another model's outputs, calibrated against human labels. |
| FinOps | Managing cloud spend by tracking, allocating and optimising costs. |
| Usage-based billing | Charging according to consumption, such as API calls or storage, which makes revenue less predictable. |
| Autoscaling | Automatically adding or removing compute resources as load changes. |
| Schema matching | Mapping the columns of one data source to the fields of another. |
| Token cost | The price of a model call, proportional to input and output tokens. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Contextual bandit | A decision problem where each round has a context, an action is chosen and only its reward is seen. |
| Constraint programming / MIP | Solvers that find the best plan satisfying hard constraints. |
| Heuristic / local search | Fast methods that find good but not provably optimal solutions. |
| Robust optimisation | Planning for the worst plausible case within an uncertainty set. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| p99 latency | The time within which 99% of requests complete. |
| Golden set | A fixed set of questions with verified answers used to score versions of a system. |
