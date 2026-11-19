# Enterprise Search Relevance: data and feature specification

> Generated from the blueprint `saas/enterprise-search-relevance` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Enterprise Search Relevance · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Enterprise Search Relevance": Return the right documents and answers across connected apps (drive, chat, wiki, tickets) respecting each user's permissions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on click logs with position bias.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Hybrid lexical-semantic score | BM25 plus dense similarity | Relevance | Fusion |   |   |   |
| Document freshness and activity | recent edits and views | Currency | Metadata |   |   |   |
| Personal and team affinity | user's team's interactions | Personalisation | Privacy |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Permissions | ACL filtering at retrieval time | Post-filtering results | Post-filtering leaks existence and wastes top-k slots |
| Signals | Behavioural click and share signals per tenant | Global popularity | Each company's relevance differs |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Document length | weak |
| File type alone | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Hybrid lexical-semantic score inputs | Product analytics | Tenant and entitlement service | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: fusion. |
| Document freshness and activity inputs | Platform engineering | Product event warehouse | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: metadata. |
| Personal and team affinity inputs | Customer success operations | CRM and billing (subscriptions) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: privacy. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: enterprise_search_relevance_inputs.v1
owner: product-analytics@example.com
system_of_record: Tenant and entitlement service
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: hybrid_lexical_semantic_score, type: double, nullable: false }
    - { name: document_freshness_and_activity, type: double, nullable: false }
    - { name: personal_and_team_affinity, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Hybrid lexical-semantic score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Document freshness and activity against Tenant and entitlement service
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Hybrid lexical-semantic score, traces back to Tenant and entitlement service; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| MS MARCO | https://microsoft.github.io/msmarco/ | Non-commercial research use (see the page) | Large-scale passage and document ranking data from real search queries | Web search, not enterprise or docs. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| BEIR benchmark | https://github.com/beir-cellar/beir | Per-dataset licences (see the repository) | A heterogeneous benchmark of 18 retrieval datasets for zero-shot evaluation | Academic tasks; domain match varies. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| KDD Cup 2012 Track 2: ad click prediction | https://www.kaggle.com/c/kddcup2012-track2 | Competition rules; free Kaggle login | Search-ad impressions with query, ad, user and position fields | Old and anonymised, but it records the display position. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- every slate that was shown, with the propensity of each item, so effects can be estimated without bias
CREATE TABLE enterprise_search_relevance_impressions (
  impression_id  UUID PRIMARY KEY,
  user_id        TEXT        NOT NULL,
  shown_at       TIMESTAMPTZ NOT NULL,
  surface        TEXT        NOT NULL,
  item_id        TEXT        NOT NULL,
  rank           SMALLINT    NOT NULL,
  score          REAL,
  propensity     REAL        NOT NULL,   -- probability the policy showed this item at this rank
  source         TEXT        NOT NULL,   -- ann | co-visit | trending | business-rule | exploration
  model_version  TEXT        NOT NULL,
  experiment_arm TEXT
) PARTITION BY RANGE (shown_at);

CREATE TABLE enterprise_search_relevance_feedback (
  impression_id  UUID        NOT NULL REFERENCES enterprise_search_relevance_impressions,
  kind           TEXT        NOT NULL,   -- click | add_to_cart | purchase | hide | return
  value          REAL,
  occurred_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (impression_id, kind, occurred_at)
);

CREATE TABLE enterprise_search_relevance_item_index (
  item_id TEXT PRIMARY KEY, embedding_version TEXT NOT NULL, available BOOLEAN NOT NULL, category TEXT, updated_at TIMESTAMPTZ NOT NULL
);
```

## Domain knowledge to learn first

Developers use documentation to build against an API or SDK, and wrong guidance costs them hours: a made-up endpoint, an outdated limit or code for the wrong version. A docs assistant answers questions from the documentation, so its value depends on how the docs are organised, how versions and deprecations work and what developers do with the answer. Understanding these makes the difference between a helpful assistant and a confident liar. For this use case, "Enterprise Search Relevance": Return the right documents and answers across connected apps (drive, chat, wiki, tickets) respecting each user's permissions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| What success means for the business | Docs teams track time to first successful API call, support tickets caused by documentation and search success. An assistant that deflects tickets but sends developers wrong limits or versions moves cost from the support team to the developer's incident. | Measure outcomes for developers, not only answer quality, and decide upfront what the assistant must never answer (billing, security advice, legal terms). |
| The anatomy of API documentation | Docs usually combine an API reference (often generated from an OpenAPI specification), guides and tutorials, a changelog or release notes, and migration guides. Each answers a different kind of question, and they can disagree: a changelog legitimately mentions old values. | Retrieval should know which kind of page it is reading. Factual answers come from the reference for the right version, not from the changelog. |
| Versions and deprecation | APIs have versions (v1, v2), SDKs have their own semantic versions (major.minor.patch) per language, and features are deprecated with a sunset date before being removed. A breaking change is one that makes existing code stop working. | The right answer depends on which version the developer is using, so version must come from context and be shown in the answer. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Implicit feedback, exposure and bias | Clicks and purchases are implicit feedback: only shown items can be clicked, higher positions get more attention and popular items are shown more. Logs therefore reflect the old system as much as user taste; corrections include position features, propensity weighting, exploration and randomised data. | Training and evaluating on logs of the incumbent ranker rewards imitating it. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Hybrid lexical-semantic score | BM25 plus dense similarity. Relevance. | Leakage risk to design against: Fusion. |
| A signal-versus-noise trap in this use case: Permissions | The true signal is aCL filtering at retrieval time; the common noise is post-filtering results. | Post-filtering leaks existence and wastes top-k slots. |

**Ask the experts**

- [ ] What exactly does "Permission-aware retrieval" mean in practice for enterprise search relevance: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Hybrid lexical-semantic score" and "Document freshness and activity", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Search success rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on click logs with position bias, and who can confirm the cut-off times and splits?
- [ ] How often does "Permission change not yet propagated" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Breaking change | A change that makes existing client code fail, which normally requires a new major version. |
| Semantic versioning | A version number scheme (major.minor.patch) in which the major number changes for breaking changes. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| API | Application programming interface: the way one program calls another, often over HTTP. |
| Endpoint | A specific URL and method of an API, such as POST /v2/payments. |
| SDK | Software development kit: a language-specific library that wraps an API. |
| OpenAPI / Swagger | A standard machine-readable description of a REST API's endpoints, parameters and schemas. |
| REST | A common style of web API built around resources and HTTP methods. |
| Webhook | An HTTP callback in which a service notifies your server when an event happens. |
| Rate limit | The maximum number of requests allowed in a time window, with errors returned when exceeded. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
| Position bias | Higher slots get more attention regardless of relevance. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| Two-tower model | A retrieval model with separate networks for user and item whose embeddings are compared by dot product. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| p99 latency | The time within which 99% of requests complete. |
