# Catalogue Attribute Extraction with LLMs: data and feature specification

> Generated from the blueprint `retail/product-catalog-attribute-extraction-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Catalogue Attribute Extraction with LLMs · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Catalogue Attribute Extraction with LLMs": Fill and normalise product attributes (size, material, compatibility) from titles, descriptions and images to power search, filters and recommendations. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Gold set from easy categories.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Extraction confidence calibration | agreement across self-consistency samples | Routing to review | Calibrate per attribute |   |   |   |
| Image-text agreement | VLM attribute vs text attribute | Detects errors | Image quality gating |   |   |   |
| Attribute coverage lift | search filter coverage after enrichment | Business value | Compare vs control categories |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Schema | Constrained decoding to taxonomy values | Free-form extraction | Free text creates unlimited attribute spellings |
| Cost | Distilled small model for the long tail with LLM for hard items | One large LLM for everything | LLM cost across 200M items is prohibitive |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Marketing adjectives | not attributes |
| Seller keywords | spam |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Extraction confidence calibration inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: calibrate per attribute. |
| Image-text agreement inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: image quality gating. |
| Attribute coverage lift inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: compare vs control categories. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: product_catalog_attribute_extraction_llm_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: extraction_confidence_calibration, type: double, nullable: false }
    - { name: image_text_agreement, type: double, nullable: false }
    - { name: attribute_coverage_lift, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Extraction confidence calibration and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Image-text agreement against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Extraction confidence calibration, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DeepMatcher entity-matching datasets | https://github.com/anhaidgroup/deepmatcher/blob/master/Datasets.md | Per-dataset terms (see the page) | Labelled record pairs for entity matching across products, publications and companies | Small to medium pairs sets. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| FUNSD form understanding | https://guillaumejaume.github.io/FUNSD/ | Research use (see the page) | 199 scanned forms annotated for entity and relation extraction | Tiny; English forms. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE product_catalog_attribute_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE product_catalog_attribute_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES product_catalog_attribute_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON product_catalog_attribute_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE product_catalog_attribute_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Catalogue Attribute Extraction with LLMs": Fill and normalise product attributes (size, material, compatibility) from titles, descriptions and images to power search, filters and recommendations. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| A catalogue that never stands still | Items are added, go out of stock, change price and spike during sales and seasons. New items have no history (cold start), and a sale can reshuffle popularity within minutes. | Counts built last week can point at items that are gone, and a random split of historical sessions hides this drift. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Extraction confidence calibration | Agreement across self-consistency samples. Routing to review. | Leakage risk to design against: Calibrate per attribute. |
| A signal-versus-noise trap in this use case: Schema | The true signal is constrained decoding to taxonomy values; the common noise is free-form extraction. | Free text creates unlimited attribute spellings. |

**Ask the experts**

- [ ] What exactly does "Strict JSON schema output" mean in practice for catalogue attribute extraction with llms: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Extraction confidence calibration" and "Image-text agreement", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Filter coverage" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: gold set from easy categories, and who can confirm the cut-off times and splits?
- [ ] How often does "Seller changes title after approval" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Attribute extraction | Pulling structured fields such as brand, size and colour from product titles, descriptions and images. |
| Catalogue | The set of items the shop sells, with attributes, prices and stock. |
| Add-to-cart / conversion | Adding an item to the basket, and completing a purchase; the later funnel stages. |
| Item-to-item | Recommending items related to the item the shopper is currently looking at. |
| Coverage | The share of the catalogue that is ever recommended, a guard against popularity machines. |
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Session | A visit: an ordered sequence of one visitor's actions, ended by inactivity or leaving. |
| Impression / click | An impression is a recommendation being shown; a click is the shopper choosing it. |
| Co-visitation | Counting how often two items are viewed in the same session, the basis of item-to-item recommenders. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Structured output | Constraining a model to produce valid JSON or SQL against a schema. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Token cost | The price of a model call, proportional to input and output tokens. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
