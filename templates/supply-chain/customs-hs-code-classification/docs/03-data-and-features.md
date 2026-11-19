# Customs HS-Code Classification: data and feature specification

> Generated from the blueprint `supply-chain/customs-hs-code-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customs HS-Code Classification · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Customs HS-Code Classification": Classify goods into Harmonised System codes from descriptions and invoices to accelerate clearance and avoid duties disputes. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on past broker mistakes.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Hierarchical code probabilities | per-level probabilities | Routing | Calibration |   |   |   |
| Material and function attributes | extracted attributes | Determines heading | Extractor accuracy |   |   |   |
| Tariff note rule hits | matched legal notes | Compliance | Version |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Hierarchy | Predict chapter, heading and subheading hierarchically | Flat 10,000-way classification | Hierarchy gives graceful degradation to the correct heading |
| Rules | Apply legal notes and general rules of interpretation | Pure text similarity | Classification is rule-governed, not purely semantic |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Invoice number | none |
| Seller name | encoded in prior shipments |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Hierarchical code probabilities inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: calibration. |
| Material and function attributes inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: extractor accuracy. |
| Tariff note rule hits inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 30 seconds freshness at p95 | Point-in-time rule: version. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: customs_hs_code_classification_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: hierarchical_code_probabilities, type: double, nullable: false }
    - { name: material_and_function_attributes, type: double, nullable: false }
    - { name: tariff_note_rule_hits, type: double, nullable: false }
sla:
  freshness_p95: 30 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Hierarchical code probabilities and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Material and function attributes against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 30 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Hierarchical code probabilities, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Web Data Commons product corpus | https://webdatacommons.org/largescaleproductcorpus/ | ODC-BY (see the page) | Millions of product offers from the web with identifiers for product matching | Web-scraped and noisy. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- point-in-time correct feature table (as_of is the ONLY join key to labels)
CREATE TABLE customs_hs_code_classification_features (
  entity_id                          TEXT        NOT NULL,
  as_of                              TIMESTAMPTZ NOT NULL,
  hierarchical_code_probabilities    DOUBLE PRECISION,
  material_and_function_attributes   DOUBLE PRECISION,
  tariff_note_rule_hits              DOUBLE PRECISION,
  PRIMARY KEY (entity_id, as_of)
) PARTITION BY RANGE (as_of);

-- every decision is logged with the exact model + feature snapshot that produced it
CREATE TABLE customs_hs_code_classification_decisions (
  decision_id    UUID PRIMARY KEY,
  entity_id      TEXT        NOT NULL,
  decided_at     TIMESTAMPTZ NOT NULL,
  model_version  TEXT        NOT NULL,
  score          REAL,
  decision       TEXT        NOT NULL,
  reason_codes   JSONB,
  latency_ms     REAL,
  degraded       BOOLEAN     NOT NULL DEFAULT FALSE
) PARTITION BY RANGE (decided_at);

-- labels arrive late and may be revised; keep source + delay for survival-aware training
CREATE TABLE customs_hs_code_classification_labels (
  decision_id    UUID        NOT NULL REFERENCES customs_hs_code_classification_decisions,
  label          SMALLINT    NOT NULL,
  label_source   TEXT        NOT NULL,
  labeled_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (decision_id, labeled_at)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Customs HS-Code Classification": Classify goods into Harmonised System codes from descriptions and invoices to accelerate clearance and avoid duties disputes. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Procurement, suppliers and trade compliance | Buyers choose suppliers, forecast commodity prices, classify spend and negotiate contracts; importers classify goods under customs codes, screen parties against denied lists and audit freight invoices. Supplier failures and sanctions have large downstream cost. | Evidence trails and explainability matter because decisions are audited, and errors can mean fines or shipment holds. |
| Horizons, lag and who uses the forecast | Demand planning produces forecasts for months or weeks ahead for budgeting and capacity; demand sensing produces 1 to 14 day forecasts that drive replenishment, expediting and allocation. Accuracy is measured at a lag: how far in advance the forecast was frozen before the day it predicts. | A model that wins at 14 days can be useless at 2 days. Report accuracy per horizon and judge it against the decision that horizon supports. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Hierarchical code probabilities | Per-level probabilities. Routing. | Leakage risk to design against: Calibration. |
| A signal-versus-noise trap in this use case: Hierarchy | The true signal is predict chapter, heading and subheading hierarchically; the common noise is flat 10,000-way classification. | Hierarchy gives graceful degradation to the correct heading. |

**Ask the experts**

- [ ] What exactly does "6-10 digit codes by country" mean in practice for customs hs-code classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Hierarchical code probabilities" and "Material and function attributes", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Auto-classification rate" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on past broker mistakes, and who can confirm the cut-off times and splits?
- [ ] How often does "Annual HS revision changes code structure" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| HS code | Harmonised System code that classifies traded goods for customs duties and rules. |
| Sell-in / sell-out | Sell-in is what a manufacturer ships to retailers; sell-out is what retailers sell to consumers. |
| Freight invoice audit | Checking carrier invoices against contracted rates and actual shipments. |
| SKU | Stock-keeping unit: one distinct product variant, such as a size and colour, tracked in inventory. |
| POS | Point of sale: the till or checkout system that records what consumers actually bought. |
| Open order / order book | Confirmed customer orders that have not yet been shipped, a leading indicator of near-term demand. |
| Lead time | The time between placing an order or replenishment and receiving it. |
| Safety stock | Extra inventory held to cover forecast error and supply variability. |
| Service level / fill rate | The probability of not stocking out in a cycle, or the share of demand met from stock. |
| Stock-out | A period when an item is unavailable, so sales are lost or delayed. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Degradation ladder | An ordered list of fallbacks the service uses as dependencies fail. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
