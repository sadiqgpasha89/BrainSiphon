# Materials Selection Assistant: data and feature specification

> Generated from the blueprint `engineering/materials-selection-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Materials Selection Assistant · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Materials Selection Assistant": Recommend candidate materials from requirements such as strength, temperature, corrosion, cost and supply, with data sources, for engineers to validate before use. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Unverified web data.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Required property ranges | strength, temperature and corrosion needs | Core | From requirements |   |   |   |
| Material property data | measured properties | Core | From the materials database |   |   |   |
| Regulatory flags | restricted substances | Constraint | From compliance data |   |   |   |
| Supply and cost | availability and price | Practicality | From procurement |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Data | Verified material datasheets and tests | Web snippets | Unverified data can be wrong |
| Constraint | Requirements and regulations together | Properties alone | Restricted substances block use |
| Role | Shortlist | Final choice | Safety-critical choices need testing |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Designer name | personal data |
| Supplier brand | weak link |
| Datasheet layout | an artefact |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Required property ranges inputs | Engineering management | CAD, BIM and document management system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from requirements. |
| Material property data inputs | Project delivery | Project scheduling and cost control platform | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the materials database. |
| Regulatory flags inputs | Health, safety and quality | Quality, safety and inspection records | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: from compliance data. |
| Supply and cost inputs | Engineering management | CAD, BIM and document management system | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from procurement. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: materials_selection_assistant_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: required_property_ranges, type: double, nullable: false }
    - { name: material_property_data, type: double, nullable: false }
    - { name: regulatory_flags, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Required property ranges and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Material property data against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Required property ranges, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Enron email dataset | https://www.cs.cmu.edu/~enron/ | Public release (see the page) | About 500,000 emails from 150 users | Old corporate email; legal and privacy sensitivities. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Statlog German Credit Data (UCI) | https://archive.ics.uci.edu/dataset/144/statlog+german+credit+data | CC BY 4.0 (see the UCI page) | 1,000 credit applicants with a good or bad label and a cost matrix | Tiny and old; useful for fairness and explainability exercises, not scale. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| DataCo Smart Supply Chain | https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis | See the dataset page; free Kaggle login | 180K order lines with shipping modes, delivery status, late-delivery risk and customers | Synthetic-looking and single company; use for pipeline work. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE materials_selection_assistant_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE materials_selection_assistant_fields (
  document_id TEXT NOT NULL REFERENCES materials_selection_assistant_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE materials_selection_assistant_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Materials Selection Assistant": Recommend candidate materials from requirements such as strength, temperature, corrosion, cost and supply, with data sources, for engineers to validate before use. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Cost grows through change | Cost overruns come from scope change, design maturity, market prices and productivity. Early estimates carry wide uncertainty that narrows as design matures. | Reporting a single number at an early stage hides the range. |
| Drawings and models carry the design information | Information sits in CAD drawings, PDFs and BIM models, often in different revisions and disciplines. Reading it reliably is a prerequisite for most automation. | Using the wrong revision is a common and costly error. |
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Gradient boosting and calibration on tabular data | Boosted trees are the workhorse for tabular problems because they handle mixed types, missing values and interactions. They overfit small positive sets without regularisation and produce scores that need calibration (Platt or isotonic) before use as probabilities. | Tune on a chronological validation set and calibrate on held-out data from the same period. |
| Retrieval and semantic matching | Search and matching combine keyword retrieval (BM25) with embeddings that match meaning, then a re-ranker orders candidates. Entity and record matching use similar tools to decide whether two texts describe the same thing. | Evaluate retrieval on real query phrasing and measure recall of the right passage separately from the quality of the final answer. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Required property ranges | Strength, temperature and corrosion needs. Core. | Leakage risk to design against: From requirements. |
| A signal-versus-noise trap in this use case: Data | The true signal is verified material datasheets and tests; the common noise is web snippets. | Unverified data can be wrong. |

**Ask the experts**

- [ ] What exactly does "Each material cites its data source" mean in practice for materials selection assistant: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Required property ranges" and "Material property data", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time to shortlist" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: unverified web data, and who can confirm the cut-off times and splits?
- [ ] How often does "Conflicting data" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Specification | A written description of required materials and workmanship. |
| Corrosion | Material loss from chemical reaction. |
| Engineer of record | The licensed engineer responsible for a design. |
| Change order | A formal change to scope, cost or time. |
| Earned value | A method that compares work done with plan and cost. |
| Claim | A request for extra time or money under a contract. |
| Monotonic constraint | A rule that the prediction may only rise (or fall) as a feature increases, used for explainability. |
| ROC-AUC | Area under the receiver operating characteristic curve: the chance a random positive is scored above a random negative. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| F1 score | The harmonic mean of precision and recall. |
| Layout analysis | Finding the structure of a page: columns, tables, headings and fields. |
| Cross-encoder / re-ranker | A model that reads a query and a candidate together to score their relevance more precisely. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Embedding | A vector that represents the meaning of a word, sentence or item, so similar things lie close together. |
| Explainability | Giving reasons for a prediction in terms the user or regulator can follow. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
