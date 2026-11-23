# Work Order Failure Code Classification: data and feature specification

> Generated from the blueprint `manufacturing/work-order-failure-code-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Work Order Failure Code Classification · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Work Order Failure Code Classification": Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Training on hurried default picks.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Component and symptom terms | named parts and symptoms in the text | Primary evidence | Maintain a synonym list |   |   |   |
| Asset class | the type of asset | Restricts valid codes | From the CMMS |   |   |   |
| Action verbs | replaced, adjusted, cleaned | Distinguishes the cause from the action | Parse the action text |   |   |   |
| Previous codes on the asset | recent failure codes | Prior | Use as a weak hint |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Taxonomy | A stable approved code list | Free text categories | Reports need consistent codes |
| Label | Codes reviewed by reliability engineers | Whatever the technician picked in a hurry | Hurried picks are often the default |
| Use | Suggestions with confidence | Auto-assigned codes | Wrong codes corrupt reliability analysis |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Technician name | irrelevant |
| Text length | not the code |
| Priority level alone | weak link |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Component and symptom terms inputs | Plant operations | MES (manufacturing execution system) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: maintain a synonym list. |
| Asset class inputs | Quality engineering | ERP and production planning | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: from the CMMS. |
| Action verbs inputs | Reliability and maintenance | CMMS or EAM maintenance system | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: parse the action text. |
| Previous codes on the asset inputs | Plant operations | MES (manufacturing execution system) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: use as a weak hint. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: work_order_failure_code_classification_inputs.v1
owner: plant-operations@example.com
system_of_record: MES (manufacturing execution system)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: component_and_symptom_terms, type: double, nullable: false }
    - { name: asset_class, type: double, nullable: false }
    - { name: action_verbs, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Component and symptom terms and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Asset class against MES (manufacturing execution system)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Component and symptom terms, traces back to MES (manufacturing execution system); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Banking77 intent dataset | https://huggingface.co/datasets/PolyAI/banking77 | CC BY 4.0 (see the page) | 13,000 customer banking queries labelled with 77 intents | Short single-turn queries. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| GoEmotions | https://github.com/google-research/google-research/tree/master/goemotions | Apache 2.0 (see the repository) | 58,000 Reddit comments labelled with 27 emotion categories | Reddit language; label subjectivity. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Jigsaw Toxic Comment Classification | https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge | Competition rules; free Kaggle login | 160K Wikipedia comments labelled for several kinds of toxicity | Wikipedia talk pages; labelling bias. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE work_order_failure_code_documents (
  document_id TEXT PRIMARY KEY, source_uri TEXT NOT NULL, sha256 TEXT NOT NULL, pages SMALLINT, document_type TEXT,
  status TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ, retention_until DATE NOT NULL
);

-- one row per extracted field with its provenance on the page
CREATE TABLE work_order_failure_code_fields (
  document_id TEXT NOT NULL REFERENCES work_order_failure_code_documents, field_name TEXT NOT NULL, value TEXT, confidence REAL NOT NULL,
  page SMALLINT, bbox REAL[4], source TEXT NOT NULL,           -- ocr | layout-model | llm | rule | human
  model_version TEXT NOT NULL, PRIMARY KEY (document_id, field_name)
);

CREATE TABLE work_order_failure_code_review_tasks (
  task_id UUID PRIMARY KEY, document_id TEXT NOT NULL, field_name TEXT NOT NULL, reason TEXT NOT NULL, -- low_confidence | validation_failed | conflict
  assigned_to TEXT, corrected_value TEXT, resolved_at TIMESTAMPTZ
);
```

## Domain knowledge to learn first

Manufacturing is judged on yield, uptime, throughput and safety, and the data comes from machines, sensors, inspection stations and planning systems that were never designed to agree. Models must work with rare failures, strict real-time limits on the line and operators who stay accountable for stopping production. For this use case, "Work Order Failure Code Classification": Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Failures are rare and degrade before they happen | Machines usually show vibration, temperature, current or pressure drift before they fail, but failures are rare and maintenance often replaces parts early, which hides the failure labels. | Training on few failures without care produces models that alarm constantly or never. |
| Visual inspection trades escapes against false rejects | Cameras classify defects such as scratches, voids and misalignment. Missing a defect lets a bad part ship, while rejecting a good part wastes cost, and the right balance depends on the defect class and the customer. | Overall accuracy hides this, so recall by defect class and the cost of each error must drive the threshold. |
| Planning and scheduling are constraint problems | Production plans must respect machine capabilities, changeover times, material availability, labour and due dates. Small disruptions force a re-plan. | A forecast alone is not a plan, so models need to feed an optimiser that respects the constraints. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Latency, cost and graceful degradation | Production systems have a time budget per request and a cost per decision. Each stage gets a share of the budget; when a dependency is slow or down the system falls back to staler features, a smaller model, rules or a safe default. | Design the fallback ladder before launch and test each rung, so an outage is a worse answer rather than no answer. |
| This use case's strongest signal: Component and symptom terms | Named parts and symptoms in the text. Primary evidence. | Leakage risk to design against: Maintain a synonym list. |
| A signal-versus-noise trap in this use case: Taxonomy | The true signal is a stable approved code list; the common noise is free text categories. | Reports need consistent codes. |

**Ask the experts**

- [ ] What exactly does "Technician confirms the suggested code" mean in practice for work order failure code classification: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Component and symptom terms" and "Asset class", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Share of work orders with a valid code" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: training on hurried default picks, and who can confirm the cut-off times and splits?
- [ ] How often does "Slang and abbreviations" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| CMMS | Computerised maintenance management system for work orders and assets. |
| Work order | An instruction to produce or repair something. |
| RUL | Remaining useful life: the time before a component should be replaced. |
| Predictive maintenance | Servicing equipment based on predicted condition instead of a fixed schedule. |
| MTBF | Mean time between failures. |
| FMEA | Failure mode and effects analysis: a structured review of how a design or process can fail. |
| Historian | A database for time-stamped sensor data from plants. |
| Rework | Fixing a defective part so it can be sold. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| TF-IDF | A word weighting that scales by how often a word appears in a document and how rare it is overall. |
| Macro-F1 | The F1 score averaged over classes, treating rare classes as equally important. |
| Annotation guideline | Written rules that tell labellers how to apply each label consistently. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
| Brier score | The mean squared difference between predicted probability and the 0/1 outcome. |
| Inter-annotator agreement | How often independent labellers give the same label, a ceiling for model accuracy. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
