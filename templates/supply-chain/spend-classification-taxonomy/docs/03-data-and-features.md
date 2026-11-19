# Spend Classification & Taxonomy Mapping: data and feature specification

> Generated from the blueprint `supply-chain/spend-classification-taxonomy` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spend Classification & Taxonomy Mapping · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Spend Classification & Taxonomy Mapping": Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training labels from earlier rule-based mappings.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Line description embedding | text embedding | Category | Language handling |   |   |   |
| Supplier primary category | supplier industry | Prior | Supplier master |   |   |   |
| Unit price and UoM | price per unit | Disambiguation | Currency conversion |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Hierarchy | Hierarchical classification with abstention | Flat classifier | Hierarchy gives partial credit and safe fallbacks |
| Feedback | Analyst corrections as labels | Static training set | Taxonomy needs continuous learning |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Invoice number | none |
| Cost centre code | org structure |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Line description embedding inputs | Supply-chain planning | ERP (orders, inventory, finance) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: language handling. |
| Supplier primary category inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: supplier master. |
| Unit price and UoM inputs | Master data team | Supplier and EDI network | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: currency conversion. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: spend_classification_taxonomy_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: line_description_embedding, type: double, nullable: false }
    - { name: supplier_primary_category, type: double, nullable: false }
    - { name: unit_price_and_uom, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Line description embedding and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Supplier primary category against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Line description embedding, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE spend_classification_taxonomy_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE spend_classification_taxonomy_fields (
  document_id TEXT NOT NULL REFERENCES spend_classification_taxonomy_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE spend_classification_taxonomy_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Spend Classification & Taxonomy Mapping": Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Procurement, suppliers and trade compliance | Buyers choose suppliers, forecast commodity prices, classify spend and negotiate contracts; importers classify goods under customs codes, screen parties against denied lists and audit freight invoices. Supplier failures and sanctions have large downstream cost. | Evidence trails and explainability matter because decisions are audited, and errors can mean fines or shipment holds. |
| Horizons, lag and who uses the forecast | Demand planning produces forecasts for months or weeks ahead for budgeting and capacity; demand sensing produces 1 to 14 day forecasts that drive replenishment, expediting and allocation. Accuracy is measured at a lag: how far in advance the forecast was frozen before the day it predicts. | A model that wins at 14 days can be useless at 2 days. Report accuracy per horizon and judge it against the decision that horizon supports. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Line description embedding | Text embedding. Category. | Leakage risk to design against: Language handling. |
| A signal-versus-noise trap in this use case: Hierarchy | The true signal is hierarchical classification with abstention; the common noise is flat classifier. | Hierarchy gives partial credit and safe fallbacks. |

**Ask the experts**

- [ ] What exactly does "5-level taxonomy (UNSPSC)" mean in practice for spend classification & taxonomy mapping: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Line description embedding" and "Supplier primary category", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Spend classified automatically" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training labels from earlier rule-based mappings, and who can confirm the cut-off times and splits?
- [ ] How often does "New category emerges" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| HS code | Harmonised System code that classifies traded goods for customs duties and rules. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Sell-in / sell-out | Sell-in is what a manufacturer ships to retailers; sell-out is what retailers sell to consumers. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Allocation | A supplier limiting how much of a scarce product each customer can receive. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Train-serve skew | A difference between how features are computed in training and in production. |
| Feature store | A system that serves the same feature definitions for training and for low-latency prediction. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
