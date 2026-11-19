# Voice Shopping (ASR + NLU): data and feature specification

> Generated from the blueprint `retail/voice-shopping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Voice Shopping (ASR + NLU) · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Voice Shopping (ASR + NLU)": Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test audio recorded in quiet rooms.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Contextual biasing list | user history and catalogue entity prior | Boosts product names | Updated frequently |   |   |   |
| ASR confidence by span | token-level confidence | Ambiguity detection | Calibrated |   |   |   |
| Reorder intent confidence | likelihood the request is a repeat purchase | Safe automation | Order history as-of |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Entity | Catalogue-biased ASR and entity resolution | Generic ASR text | Product and brand names are rare words for generic ASR |
| Safety | Explicit confirmation for purchases | Direct ordering from ASR text | ASR errors become wrong orders |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Speaker gender | unrelated |
| Audio duration | weak |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Contextual biasing list inputs | Catalogue operations | Product information management (PIM) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: updated frequently. |
| ASR confidence by span inputs | E-commerce engineering | Order management system (OMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: calibrated. |
| Reorder intent confidence inputs | Customer analytics | Customer data platform (CDP) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: order history as-of. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: voice_shopping_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: contextual_biasing_list, type: double, nullable: false }
    - { name: asr_confidence_by_span, type: double, nullable: false }
    - { name: reorder_intent_confidence, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Contextual biasing list and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for ASR confidence by span against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Contextual biasing list, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Mozilla Common Voice | https://commonvoice.mozilla.org/en/datasets | CC0 (see the page) | Crowd-sourced speech recordings with transcripts in many languages | Read speech; accents and noise vary. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE voice_shopping_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE voice_shopping_fields (
  document_id TEXT NOT NULL REFERENCES voice_shopping_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE voice_shopping_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Voice Shopping (ASR + NLU)": Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Sessions, anonymity and privacy | A session is a sequence of actions by one visitor, usually split by 30 minutes of inactivity. Many visitors are anonymous or have declined tracking, so the system may only use what happened in this visit and aggregated behaviour of others, not a stored profile. | The model must work from a few clicks, and the way sessions are cut decides what a sequence even is. |
| Speech and multimodal text | Speech systems turn audio into text and back, and document systems read scans with OCR and layout models. Errors cascade: a misheard word becomes a wrong field downstream. | Measure the whole pipeline end to end, with the accents, noise and scan quality of the real population. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Contextual biasing list | User history and catalogue entity prior. Boosts product names. | Leakage risk to design against: Updated frequently. |
| A signal-versus-noise trap in this use case: Entity | The true signal is catalogue-biased ASR and entity resolution; the common noise is generic ASR text. | Product and brand names are rare words for generic ASR. |

**Ask the experts**

- [ ] What exactly does "Under 1.5 s response" mean in practice for voice shopping (asr + nlu): who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Contextual biasing list" and "ASR confidence by span", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Voice order success rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: test audio recorded in quiet rooms, and who can confirm the cut-off times and splits?
- [ ] How often does "Background noise from kitchen" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Attribute extraction | Pulling structured fields such as brand, size and colour from product titles, descriptions and images. |
| Visual search | Finding products from a photograph or image rather than text. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Popularity bias | The tendency of recommenders to push already-popular items, starving the long tail. |
| SKU | Stock-keeping unit: one distinct product variant such as a size and colour. |
| AOV | Average order value: revenue divided by the number of orders. |
| Basket | The set of items in a customer's cart or order; basket analysis finds items bought together. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Word error rate (WER) | Errors in recognised speech divided by the number of reference words. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| CTC loss | A loss that aligns a signal such as audio or a line image to its text without frame labels. |
| Point-in-time correctness | Building each training example only from data that existed at the moment of the decision. |
| p99 latency | The time within which 99% of requests complete. |
| Fairness metrics | Measures of whether a model's errors or outcomes differ between groups, such as demographic parity or equalised odds. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Intent classification | Deciding what a user wants from their message, such as 'reset password'. |
