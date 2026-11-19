# Review Summarisation & Product Q&A: data and feature specification

> Generated from the blueprint `retail/review-summarization-and-q-and-a` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Review Summarisation & Product Q&A · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Review Summarisation & Product Q&A": Summarise thousands of reviews into balanced pros/cons and answer product questions with citations from reviews and specs. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Summaries judged for fluency not support.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Aspect coverage | share of frequent aspects represented | Completeness | Aspects extracted offline |   |   |   |
| Review quality weight | helpfulness and verified-purchase weight | Trust | Votes as-of |   |   |   |
| Support rate | share of summary claims supported by cited reviews | Faithfulness | Entailment check |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Aspect | Aspect-based clustering with sentiment per aspect | Single overall summary | Overall summaries hide that battery is bad while screen is great |
| Trust | Weight by verified purchase and spam score | All reviews equal | Fake reviews skew summaries |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Extreme 1-star rants | outliers |
| Emoji counts | no content |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Aspect coverage inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: aspects extracted offline. |
| Review quality weight inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: votes as-of. |
| Support rate inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: entailment check. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: review_summarization_and_q_and_a_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: aspect_coverage, type: double, nullable: false }
    - { name: review_quality_weight, type: double, nullable: false }
    - { name: support_rate, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Aspect coverage and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Review quality weight against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Aspect coverage, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Amazon Reviews 2023 | https://amazon-reviews-2023.github.io/ | Research terms on the project page | Hundreds of millions of product reviews with item metadata across categories | Very large; consumer-review language and bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DocVQA | https://www.docvqa.org/ | Research terms (see the site) | Question answering over document images with text and layout | Mostly English business documents. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE review_summarization_and_q_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE review_summarization_and_q_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES review_summarization_and_q_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON review_summarization_and_q_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE review_summarization_and_q_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Review Summarisation & Product Q&A": Summarise thousands of reviews into balanced pros/cons and answer product questions with citations from reviews and specs. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Grounding, citation and abstention | A language model's fluent answer can be wrong. Grounded systems answer only from retrieved or tool-provided evidence, cite it, check that the citation supports the claim and abstain when the evidence is missing. | A valid-looking citation does not prove correctness; verify that the cited passage supports the statement for the right version, and measure abstention separately. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Aspect coverage | Share of frequent aspects represented. Completeness. | Leakage risk to design against: Aspects extracted offline. |
| A signal-versus-noise trap in this use case: Aspect | The true signal is aspect-based clustering with sentiment per aspect; the common noise is single overall summary. | Overall summaries hide that battery is bad while screen is great. |

**Ask the experts**

- [ ] What exactly does "Balanced, not cherry-picked" mean in practice for review summarisation & product q&a: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Aspect coverage" and "Review quality weight", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time on page to decision" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: summaries judged for fluency not support, and who can confirm the cut-off times and splits?
- [ ] How often does "New product with 3 reviews" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Attribute extraction | Pulling structured fields such as brand, size and colour from product titles, descriptions and images. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Coverage | The share of the catalogue that is ever recommended, a guard against popularity machines. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Query understanding | Interpreting a search query: spelling correction, intent, entities and attributes. |
| Counterfeit | A fake product sold as genuine, a major marketplace trust issue. |
| Visual search | Finding products from a photograph or image rather than text. |
| Faithfulness | Whether an answer is supported by the cited sources. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Hallucination | A fluent statement not supported by the sources or by reality. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Summarisation | Condensing text while keeping the key facts; evaluated for faithfulness, not just fluency. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
