# Search Relevance Evaluation with LLM Judges: data and feature specification

> Generated from the blueprint `retail/search-relevance-llm-judge-evaluation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Search Relevance Evaluation with LLM Judges · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Search Relevance Evaluation with LLM Judges": Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Judge and ranker share a base model.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Judge-human agreement | Cohen's kappa on anchor set | Judge reliability | Refresh anchors quarterly |   |   |   |
| Rubric attribute coverage | fraction of query attributes verified | Specific checking | Parse attributes deterministically |   |   |   |
| Inter-judge variance | disagreement across prompts and seeds | Uncertainty | Sampling at fixed temperature |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Calibration | Judge calibrated against a human-labelled anchor set | Using judge scores raw | LLM judges are consistently lenient on fluent but wrong results |
| Rubric | Structured rubric with attribute checks | Single vague score | Vague prompts give unstable scores |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Judge self-reported confidence | uncalibrated |
| Length of justification | not accuracy |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Judge-human agreement inputs | Catalogue operations | Product information management (PIM) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: refresh anchors quarterly. |
| Rubric attribute coverage inputs | E-commerce engineering | Order management system (OMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: parse attributes deterministically. |
| Inter-judge variance inputs | Customer analytics | Customer data platform (CDP) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: sampling at fixed temperature. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: search_relevance_llm_judge_evaluation_inputs.v1
owner: catalogue-operations@example.com
system_of_record: Product information management (PIM)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: judge_human_agreement, type: double, nullable: false }
    - { name: rubric_attribute_coverage, type: double, nullable: false }
    - { name: inter_judge_variance, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Judge-human agreement and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Rubric attribute coverage against Product information management (PIM)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Judge-human agreement, traces back to Product information management (PIM); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| OpenML | https://www.openml.org/ | Per-dataset licences (see the site) | Thousands of versioned tabular datasets with tasks and benchmarks | Mostly small and clean. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| UCI Machine Learning Repository | https://archive.ics.uci.edu/ | Per-dataset licences (see the site) | A long-standing archive of small and medium datasets across domains | Small and old; good for code, weak for realism. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- ingestion: documents and the chunks cut from them; ACLs are copied onto every chunk
CREATE TABLE search_relevance_llm_judge_documents (
  doc_id TEXT PRIMARY KEY, source TEXT NOT NULL, version INT NOT NULL, content_hash TEXT NOT NULL,
  acl_groups TEXT[] NOT NULL, classification TEXT NOT NULL, effective_from DATE, effective_to DATE, ingested_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE search_relevance_llm_judge_chunks (
  chunk_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES search_relevance_llm_judge_documents, ordinal INT NOT NULL,
  text TEXT NOT NULL, token_count INT NOT NULL, acl_groups TEXT[] NOT NULL,
  embedding VECTOR(1024) NOT NULL, embedding_model TEXT NOT NULL
);
CREATE INDEX ON search_relevance_llm_judge_chunks USING hnsw (embedding vector_cosine_ops);

-- every answer is auditable: what was asked, what was retrieved, what was said and on which versions
CREATE TABLE search_relevance_llm_judge_answers (
  answer_id UUID PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, asked_at TIMESTAMPTZ NOT NULL,
  question_hash TEXT NOT NULL, retrieved_chunk_ids TEXT[] NOT NULL, cited_chunk_ids TEXT[] NOT NULL,
  grounded BOOLEAN NOT NULL, prompt_version TEXT NOT NULL, model_version TEXT NOT NULL, feedback SMALLINT
);
```

## Domain knowledge to learn first

An online shop shows recommendation strips on product, cart and home pages, often to visitors it knows nothing about. A session-based recommender uses only the clicks of the current visit to suggest what to look at next. The domain questions are about shopper intent, what the catalogue allows and what the business gets paid for: an irrelevant, out-of-stock or unprofitable item is a miss even when the model's score is high. For this use case, "Search Relevance Evaluation with LLM Judges": Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Search, browse and ranking in a marketplace | Shoppers arrive through search queries, category pages and recommendation strips. Each is a ranking problem with different signals: a query has explicit intent, a category page has none, and a marketplace must also be fair to sellers and obey sponsored-placement rules. Position bias means top slots get clicks regardless of quality. | Offline relevance judgments, click logs and revenue metrics disagree; ranking systems are judged by interleaving and online tests, with exposure and fairness constraints. |
| Offline metrics versus business outcomes | Offline ranking metrics (hit rate, MRR, NDCG) measure whether the held-out next item was ranked high. The business cares about click-through on the strip, add-to-cart and revenue per visit, plus catalogue coverage so that long-tail sellers get exposure. Recommendations also obey merchandising rules: stock, margin, brand and sponsored items. | A model can improve MRR while concentrating on a few popular items. Track coverage and run online tests. |
| Catalogue quality and product data | Everything downstream depends on clean product data: titles, attributes, categories, images and identifiers. Matching duplicate listings, extracting attributes from text and checking image quality are catalogue tasks, usually evaluated on precision of matches and coverage of attributes. | Errors in the catalogue (wrong size, merged products) cause returns and search failures that no ranking model can fix. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Judge-human agreement | Cohen's kappa on anchor set. Judge reliability. | Leakage risk to design against: Refresh anchors quarterly. |
| A signal-versus-noise trap in this use case: Calibration | The true signal is judge calibrated against a human-labelled anchor set; the common noise is using judge scores raw. | LLM judges are consistently lenient on fluent but wrong results. |

**Ask the experts**

- [ ] What exactly does "Agreement with human raters" mean in practice for search relevance evaluation with llm judges: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Judge-human agreement" and "Rubric attribute coverage", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Release decisions matching later A/B outcomes" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: judge and ranker share a base model, and who can confirm the cut-off times and splits?
- [ ] How often does "Judge model update" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Learning to rank | Training models to order items by relevance, using pointwise, pairwise or listwise losses. |
| Query understanding | Interpreting a search query: spelling correction, intent, entities and attributes. |
| Conversion rate | The share of visits or sessions that end in a purchase. |
| Position bias | Items shown higher get more clicks regardless of quality, so click logs must be corrected. |
| Visual search | Finding products from a photograph or image rather than text. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Golden set | A fixed set of questions with verified answers used to score versions of a system. |
| Fine-tuning / SFT | Further training a language model on examples of the desired behaviour. |
| Audit trail | A tamper-evident record of what the system saw, decided and did. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| BM25 | A classic keyword-ranking function that scores documents by term frequency and rarity. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
