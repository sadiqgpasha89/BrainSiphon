# Gift Recommendation Assistant: data and feature specification

> Generated from the blueprint `retail/gift-recommendations-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Gift Recommendation Assistant · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Gift Recommendation Assistant": Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluating on easy briefs.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Gift-brief completeness | filled slots out of required | Dialogue state | Slot extractor accuracy |   |   |   |
| Deadline feasibility | whether delivery date meets occasion date | Hard filter | Live carrier promises |   |   |   |
| Recipient interest match | interest embedding vs item embedding | Relevance | Self-reported interests |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Slots | Structured gift brief (recipient, occasion, budget, deadline) | Free text only | Missing budget or date makes results useless |
| Delivery | Delivery-date feasibility in ranking | Relevance only | A perfect gift that arrives late is a failure |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Chat tone | stylistic only |
| Sender browsing history | not the recipient |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Gift-brief completeness inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: slot extractor accuracy. |
| Deadline feasibility inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: live carrier promises. |
| Recipient interest match inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: self-reported interests. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: gift_recommendations_llm_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: gift_brief_completeness, type: double, nullable: false }
    - { name: deadline_feasibility, type: double, nullable: false }
    - { name: recipient_interest_match, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Gift-brief completeness and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Deadline feasibility against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Gift-brief completeness, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Monash Time Series Forecasting Archive | https://forecastingdata.org/ | Per-dataset licences (see the site) | A curated archive of forecasting datasets across domains with standard splits | Benchmarks, not your data. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE gift_recommendations_llm_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE gift_recommendations_llm_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES gift_recommendations_llm_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON gift_recommendations_llm_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE gift_recommendations_llm_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Gift Recommendation Assistant": Help users find gifts for recipients and occasions through a short conversation with grounded product suggestions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| A catalogue that never stands still | Items are added, go out of stock, change price and spike during sales and seasons. New items have no history (cold start), and a sale can reshuffle popularity within minutes. | Counts built last week can point at items that are gone, and a random split of historical sessions hides this drift. |
| Search, browse and ranking in a marketplace | Shoppers arrive through search queries, category pages and recommendation strips. Each is a ranking problem with different signals: a query has explicit intent, a category page has none, and a marketplace must also be fair to sellers and obey sponsored-placement rules. Position bias means top slots get clicks regardless of quality. | Offline relevance judgments, click logs and revenue metrics disagree; ranking systems are judged by interleaving and online tests, with exposure and fairness constraints. |
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Retrieval, ranking and re-ranking | Recommenders usually work in stages: fast candidate retrieval from millions of items, a ranker that scores the shortlist with richer features, and a re-ranker that applies business rules, diversity and stock. Each stage has its own latency budget and metrics. | Optimise the whole pipeline: a better ranker cannot recover an item the retrieval stage never returned. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Gift-brief completeness | Filled slots out of required. Dialogue state. | Leakage risk to design against: Slot extractor accuracy. |
| A signal-versus-noise trap in this use case: Slots | The true signal is structured gift brief (recipient, occasion, budget, deadline); the common noise is free text only. | Missing budget or date makes results useless. |

**Ask the experts**

- [ ] What exactly does "Budget and delivery date constraints" mean in practice for gift recommendation assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Gift-brief completeness" and "Deadline feasibility", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Gift conversion rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluating on easy briefs, and who can confirm the cut-off times and splits?
- [ ] How often does "Seasonal peak (festival)" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Embedding / ANN | A learned vector for an item or session, and approximate nearest-neighbour search to find similar vectors quickly. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Session | A visit: an ordered sequence of one visitor's actions, ended by inactivity or leaving. |
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Co-visitation | Counting how often two items are viewed in the same session, the basis of item-to-item recommenders. |
| RAG | Retrieval-augmented generation: a model answers using passages retrieved from a document collection. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Candidate generation | The first stage that selects a few hundred items from the full catalogue. |
| NDCG | Normalised discounted cumulative gain: a ranking score that rewards relevant items near the top. |
| MRR | Mean reciprocal rank: the average of one over the rank of the first relevant item. |
| ANN search | Approximate nearest-neighbour search that finds similar vectors quickly. |
| p99 latency | The time within which 99% of requests complete. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
